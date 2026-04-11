---
phase: "1-security-reliability"
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/auth/guards.ts
  - src/app/(app)/admin/actions.ts
  - src/app/(app)/admin/sabados/actions.ts
  - src/app/(app)/admin/buses/actions.ts
  - src/app/(app)/admin/schools/actions.ts
  - src/app/(app)/wiki/actions.ts
  - src/app/(app)/tutoras/actions.ts
  - src/app/api/geocode/route.ts
  - src/lib/offline/attendanceQueue.ts
  - src/lib/hooks/useAttendance.ts
  - src/app/api/attendance/[divisionId]/export/route.ts
  - package.json
autonomous: false
requirements:
  - SEC-01
  - SEC-02
  - SEC-03
  - SEC-04
  - SEC-05
  - REL-01
  - DEP-01
  - DEP-02

must_haves:
  truths:
    - "An authenticated coach calling any admin server action directly receives an error, not a successful mutation"
    - "An unauthenticated HTTP request to /api/geocode returns 401"
    - "When a coach goes offline and saves attendance, the record appears in Supabase after reconnecting"
    - "Downloading the attendance export produces a valid .xlsx file that opens in Excel"
    - "npm run build passes with zero TypeScript errors after all changes"
  artifacts:
    - path: "src/lib/auth/guards.ts"
      provides: "Shared assertAdmin() and assertTutoraOrAdmin() used by all server action files"
      exports: ["assertAdmin", "assertTutoraOrAdmin"]
    - path: "src/lib/offline/attendanceQueue.ts"
      provides: "IndexedDB queue for offline attendance persistence"
      exports: ["enqueue", "dequeue", "getAllQueued", "QueuedAttendance"]
    - path: "src/lib/hooks/useAttendance.ts"
      provides: "Refactored hook: queue-first save, drain on online, pending indicator"
  key_links:
    - from: "sabados/actions.ts, buses/actions.ts, schools/actions.ts, wiki/actions.ts"
      to: "src/lib/auth/guards.ts"
      via: "import { assertAdmin } from '@/lib/auth/guards'"
      pattern: "assertAdmin\\(\\)"
    - from: "src/lib/hooks/useAttendance.ts"
      to: "src/lib/offline/attendanceQueue.ts"
      via: "enqueue() called before fetch, drainQueue() on window online event"
      pattern: "enqueue|drainQueue|addEventListener.*online"
    - from: "src/app/api/attendance/[divisionId]/export/route.ts"
      to: "ExcelJS"
      via: "wb.xlsx.writeBuffer()"
      pattern: "writeBuffer"
---

<objective>
Harden the VRC Presentismo PWA against its top security vulnerabilities and reliability failures.

Purpose: Three audit findings are exploitable in production today: (1) 16 admin server actions have no role check — any authenticated coach can call them directly; (2) the attendance flow has no offline resilience — a dropped connection at save time loses data; (3) the xlsx dependency has a confirmed ReDoS CVE with no patch on npm.

Output: A shared auth guards module, 16 server actions protected by assertAdmin(), a geocode route that requires authentication, an IndexedDB offline queue for attendance, and xlsx replaced with exceljs. No external service changes required.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/codebase/ARCHITECTURE.md
@.planning/codebase/CONVENTIONS.md
@.planning/phase-1/RESEARCH.md

<interfaces>
<!-- Key contracts the executor needs. Read directly from codebase. -->

From src/app/(app)/admin/actions.ts (current assertAdmin — private, to be extracted):
```typescript
// Current private implementation — move this to src/lib/auth/guards.ts as exported
async function assertAdmin(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Sin permisos')
}

// Current exported implementation — move this to src/lib/auth/guards.ts
export async function assertTutoraOrAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'tutora'].includes(profile?.role)) throw new Error('Sin permisos')
  return { user, role: profile?.role as 'admin' | 'tutora' }
}
```

From src/lib/hooks/useAttendance.ts (current hook signature — must be preserved):
```typescript
interface UseAttendanceOptions {
  initialState: AttendanceState
  divisionId: string
  date: string
}
// Return type must remain identical:
// { attendance, toggle, save, saving, saved, error, presentCount }
// Add: pendingCount: number (new — count of queued offline items)
```

From src/app/(app)/tutoras/actions.ts (imports assertTutoraOrAdmin — must update):
```typescript
import { assertTutoraOrAdmin } from '@/app/(app)/admin/actions'
// → must change to:
import { assertTutoraOrAdmin } from '@/lib/auth/guards'
```

From src/app/api/attendance/[divisionId]/export/route.ts (xlsx API surface to replace):
```typescript
// REMOVE:
import * as XLSX from 'xlsx'
XLSX.utils.aoa_to_sheet(wsData)
XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, division.name)
XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
ws['!cols'] = [{ wch: 30 }, ...]

// REPLACE WITH (exceljs):
import ExcelJS from 'exceljs'
const wb = new ExcelJS.Workbook()
const ws = wb.addWorksheet(division.name)
ws.addRows([header, ...rows, footerRow])
ws.getColumn(1).width = 30  // etc for each column
const buf = await wb.xlsx.writeBuffer()  // async — must await
```
</interfaces>
</context>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Authenticated coach → Server Action | Coach session can call any 'use server' action via direct POST — RLS is not sufficient if policies are permissive or if createAdminClient() is used inside the action |
| Unauthenticated request → /api/geocode | Route is publicly reachable; middleware only guards app pages, not API routes |
| Client → /api/attendance (offline) | Attendance data written to IndexedDB in the browser; must be sent with valid session when connectivity returns |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-1-01 | Elevation of Privilege | sabados/actions.ts, buses/actions.ts, schools/actions.ts | mitigate | Add `await assertAdmin()` as first line of every exported action in all three files (Task 2). Guards throw on non-admin, propagating to Next.js error boundary. |
| T-1-02 | Elevation of Privilege | wiki/actions.ts — saveWikiPage, deleteWikiPage | mitigate | Add `await assertAdmin()` to both wiki write actions (Task 3). Read-only for coaches is correct UI behavior; enforce at the action level too. |
| T-1-03 | Denial of Service | /api/geocode — unauthenticated Nominatim proxy | mitigate | Add Supabase session check; return 401 if no user (Task 4). Nominatim bans IPs that exceed 1 req/sec — public endpoint enables abuse. Note: also add Vercel Firewall rate limit rule (manual step documented in Task 4). |
| T-1-04 | Information Disclosure | xlsx CVE-2024-22363 (ReDoS) in export route | mitigate | Replace xlsx with exceljs 4.4.0 (Task 8). ReDoS via crafted formula string in cell content; exceljs has no current high CVEs. |
| T-1-05 | Spoofing | Offline attendance queue replayed without valid session | accept | Supabase session is stored in httpOnly cookie managed by @supabase/ssr. The fetch from drainQueue() runs in the browser and sends the session cookie automatically. If the session has expired (>1 hour), the /api/attendance route will return 401 and the item stays queued. Low risk: coaches use the PWA daily and sessions are refreshed on activity. |
| T-1-06 | Tampering | IndexedDB attendance queue tampered by client | accept | IndexedDB is same-origin only. The /api/attendance route validates session and division access server-side before persisting. Tampered data would fail RLS on the coaching division check. No additional mitigation needed. |
</threat_model>

<tasks>

<task type="auto">
  <name>Task 1: Create shared auth guards module and migrate assertTutoraOrAdmin</name>
  <files>
    src/lib/auth/guards.ts
    src/app/(app)/admin/actions.ts
    src/app/(app)/tutoras/actions.ts
  </files>
  <action>
Create `src/lib/auth/guards.ts` — a server-side module (no 'use server' directive needed; it is called from server actions) that exports both guard functions:

```typescript
import { createClient } from '@/lib/supabase/server'

export async function assertAdmin(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Sin permisos')
}

export async function assertTutoraOrAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!['admin', 'tutora'].includes(profile?.role)) throw new Error('Sin permisos')
  return { user, role: profile?.role as 'admin' | 'tutora' }
}
```

Then update `src/app/(app)/admin/actions.ts`:
- Remove the private `assertAdmin` function (lines 7-17)
- Remove the exported `assertTutoraOrAdmin` function (lines 19-30)
- Add import: `import { assertAdmin } from '@/lib/auth/guards'`
- All existing `await assertAdmin()` calls in this file continue to work unchanged

Then update `src/app/(app)/tutoras/actions.ts`:
- Change the import on line 5 from `import { assertTutoraOrAdmin } from '@/app/(app)/admin/actions'`
  to `import { assertTutoraOrAdmin } from '@/lib/auth/guards'`
- No other changes in this file

Do NOT add 'use server' to guards.ts — it is a plain async module imported by server action files that already have 'use server'. Adding the directive to a library file would be incorrect.

WARNING: guards.ts imports from '@/lib/supabase/server'. This file must NEVER be imported from any Client Component. It is only safe to import from files that have 'use server' at the top, from Server Components, or from other server-only modules.
  </action>
  <verify>npm run build — must pass with zero TypeScript errors. The build will fail if tutoras/actions.ts still imports from admin/actions.ts after the export is removed.</verify>
  <done>
    - src/lib/auth/guards.ts exists and exports assertAdmin and assertTutoraOrAdmin
    - admin/actions.ts no longer defines either function; it imports assertAdmin from guards
    - tutoras/actions.ts imports assertTutoraOrAdmin from '@/lib/auth/guards' (not admin/actions)
    - npm run build passes
  </done>
</task>

<task type="auto">
  <name>Task 2: Add assertAdmin() to all 16 unguarded admin actions across 3 files</name>
  <files>
    src/app/(app)/admin/sabados/actions.ts
    src/app/(app)/admin/buses/actions.ts
    src/app/(app)/admin/schools/actions.ts
  </files>
  <action>
This task depends on Task 1 (guards.ts must exist). Add `import { assertAdmin } from '@/lib/auth/guards'` and call `await assertAdmin()` as the FIRST line of every exported action in each file.

**sabados/actions.ts** — 12 actions to guard (add import at top, then guard each):
- addOpponentClub
- renameClub
- toggleClubActive
- saveDivisionActivity
- deleteDivisionActivity
- saveTercerTiempo
- updateClubCoordinator
- addVenue
- updateVenue
- updateVenueCoords
- deleteVenue
- saveTercerTiempoVisitors

For saveDivisionActivity: the existing `const { data: { user } } = await supabase.auth.getUser()` on line 63 stays (it is used to set created_by). The assertAdmin() call goes BEFORE it, as the very first line of the function body, after the input validation at the top. Actually, place it before any logic — move it to be the literal first statement in the function, before input destructuring/validation. Pattern:

```typescript
export async function saveDivisionActivity(formData: FormData) {
  await assertAdmin()  // ← first line
  const event_date = formData.get('event_date') as string
  // ... rest unchanged
```

**buses/actions.ts** — 3 actions to guard:
- createBus
- updateBus
- toggleBusActive

**schools/actions.ts** — 3 actions to guard:
- createSchool
- updateSchool
- mergeSchools (this is the most critical — reassigns all players and deactivates the source school)

For createSchool, which currently returns `Promise<{ id: string; name: string } | null>`, the assertAdmin() call goes first. If the guard throws, the throw propagates (no return type change needed — TypeScript's control flow handles this).

The guard throws on failure; it does NOT return `{ error }`. This is the established pattern in admin/actions.ts and is intentional: thrown errors propagate to the Next.js error boundary, not to the UI as a recoverable error object.
  </action>
  <verify>npm run build — must pass. Spot-check: open sabados/actions.ts and confirm the first line of addOpponentClub is `await assertAdmin()`.</verify>
  <done>
    - All 18 actions in the three files start with `await assertAdmin()`
    - Each file imports assertAdmin from '@/lib/auth/guards'
    - npm run build passes
  </done>
</task>

<task type="auto">
  <name>Task 3: Guard wiki write actions and secure geocode route</name>
  <files>
    src/app/(app)/wiki/actions.ts
    src/app/api/geocode/route.ts
  </files>
  <action>
**wiki/actions.ts:**

Add `import { assertAdmin } from '@/lib/auth/guards'` at the top.

Add `await assertAdmin()` as the first line of both exported functions:
- saveWikiPage — currently starts by getting the user; assertAdmin() replaces the need for the manual user lookup there. The `user?.id` used for `updated_by`/`created_by` will need to be obtained after assertAdmin() passes. Since assertAdmin() does not return the user, do the user fetch separately after the guard:

```typescript
export async function saveWikiPage(formData: FormData) {
  await assertAdmin()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // ... rest unchanged
```

Note: this is a second Supabase call after assertAdmin already made one. It is a minor inefficiency but keeps the code clear and consistent with the established guard pattern. The auth session is cached within the request by Supabase SSR, so performance impact is negligible.

- deleteWikiPage — add `await assertAdmin()` as first line; keep the rest unchanged.

**api/geocode/route.ts:**

Add session check at the very start of the GET handler, before the query parameter is read. Use `createClient` from `@/lib/supabase/server`:

```typescript
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })

  const { searchParams } = new URL(request.url)
  // ... rest of handler unchanged
```

The route already imports NextResponse. The 401 returns an empty array (not an object) to match the existing return type pattern in this handler.

MANUAL STEP (document in a comment at the top of the file): Also add a Vercel Firewall rate-limit rule:
  Vercel Dashboard → Security → Firewall → Add Rule
  Condition: Path matches /api/geocode
  Action: Rate Limit — Fixed Window, 60 seconds, 20 requests
This cannot be done in code; it is a one-time dashboard action.
  </action>
  <verify>
After deploying: `curl -I https://vrc-presentismo.vercel.app/api/geocode?q=Buenos+Aires` should return HTTP 401. Locally: start dev server, open incognito, fetch /api/geocode — should see 401 in network tab.
  </verify>
  <done>
    - saveWikiPage and deleteWikiPage each start with await assertAdmin()
    - /api/geocode returns 401 for unauthenticated requests
    - npm run build passes
  </done>
</task>

<task type="auto">
  <name>Task 4: Raise password minimum to 8 characters</name>
  <files>
    src/app/(app)/admin/actions.ts
  </files>
  <action>
In `src/app/(app)/admin/actions.ts`, find the two password length checks and update both:

1. In `createCoach` (currently around line 43):
   Change: `if (password.length < 6) { return { error: 'La contraseña debe tener al menos 6 caracteres' } }`
   To:     `if (password.length < 8) { return { error: 'La contraseña debe tener al menos 8 caracteres' } }`

2. In `createTutora` (currently around line 86):
   Same change — `< 6` → `< 8`, update the error message to 8 caracteres.

MANUAL STEP: In the Supabase dashboard → Authentication → Providers → Email → Password policy, update the minimum password length from 6 to 8 to match this code change. This is a one-time dashboard change that cannot be done in code.
  </action>
  <verify>npm run build passes. The change is trivial but run build to catch any accidental edits.</verify>
  <done>
    - Both password checks in admin/actions.ts use `< 8` and reference "8 caracteres"
    - npm run build passes
  </done>
</task>

<task type="auto">
  <name>Task 5: Create IndexedDB offline attendance queue</name>
  <files>
    src/lib/offline/attendanceQueue.ts
    package.json
  </files>
  <action>
First, install the `idb` package:
```bash
npm install idb@8.0.2
```

Then create `src/lib/offline/attendanceQueue.ts`. This is a CLIENT-SIDE ONLY module — it must not import from any Supabase server modules. It will be imported only from useAttendance.ts (a 'use client' hook).

```typescript
import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'vrc-offline'
const DB_VERSION = 1
const STORE = 'attendance-queue'

export interface QueuedAttendance {
  id: string                        // composite key: `${divisionId}-${date}`
  divisionId: string
  date: string
  attendance: Record<string, boolean>
  queuedAt: number                  // Date.now()
}

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    },
  })
}

export async function enqueue(item: Omit<QueuedAttendance, 'id' | 'queuedAt'>): Promise<void> {
  const db = await getDB()
  const entry: QueuedAttendance = {
    ...item,
    id: `${item.divisionId}-${item.date}`,
    queuedAt: Date.now(),
  }
  await db.put(STORE, entry)  // put = upsert — same divisionId+date overwrites previous
}

export async function dequeue(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE, id)
}

export async function getAllQueued(): Promise<QueuedAttendance[]> {
  const db = await getDB()
  return db.getAll(STORE)
}

export async function getPendingCount(): Promise<number> {
  const db = await getDB()
  return db.count(STORE)
}
```

Key design decisions:
- `put` (not `add`) is used in enqueue so toggling attendance and saving again overwrites the queued item rather than duplicating it. The id is `${divisionId}-${date}` which is the natural unique key for an attendance session.
- DB_VERSION is 1. If the schema needs to change in future, increment this and add upgrade logic.
- No TypeScript error from IDBPDatabase generic — the idb types are correct for this usage.
  </action>
  <verify>npm run build — idb must resolve correctly. If TypeScript errors appear related to idb types, run `npm install --save-dev @types/idb` (though idb ships its own types and this should not be needed).</verify>
  <done>
    - src/lib/offline/attendanceQueue.ts exists and exports enqueue, dequeue, getAllQueued, getPendingCount, QueuedAttendance
    - idb is in package.json dependencies
    - npm run build passes
  </done>
</task>

<task type="auto">
  <name>Task 6: Refactor useAttendance hook for offline-first save with queue drain</name>
  <files>
    src/lib/hooks/useAttendance.ts
  </files>
  <action>
Refactor `src/lib/hooks/useAttendance.ts` to add IndexedDB queue-first save behavior. The public API of the hook must be backwards compatible EXCEPT for one addition: `pendingCount: number` is added to the return type.

The complete new implementation:

```typescript
'use client'

import { useState, useCallback, useEffect } from 'react'
import type { AttendanceState } from '@/types'
import {
  enqueue,
  dequeue,
  getAllQueued,
  getPendingCount,
} from '@/lib/offline/attendanceQueue'

interface UseAttendanceOptions {
  initialState: AttendanceState
  divisionId: string
  date: string
}

async function flushItem(divisionId: string, date: string, attendance: Record<string, boolean>): Promise<boolean> {
  try {
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ divisionId, date, attendance }),
    })
    return res.ok
  } catch {
    return false
  }
}

async function drainQueue(): Promise<void> {
  const items = await getAllQueued()
  for (const item of items) {
    const ok = await flushItem(item.divisionId, item.date, item.attendance)
    if (ok) {
      await dequeue(item.id)
    }
    // If not ok, leave in queue — will retry on next drain
  }
}

export function useAttendance({ initialState, divisionId, date }: UseAttendanceOptions) {
  const [attendance, setAttendance] = useState<AttendanceState>(initialState)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingCount, setPendingCount] = useState(0)

  // Refresh pending count
  const refreshPending = useCallback(async () => {
    const count = await getPendingCount()
    setPendingCount(count)
  }, [])

  // On mount: drain any items left from a previous session, update pending count
  useEffect(() => {
    drainQueue().then(() => refreshPending())
  }, [refreshPending])

  // On reconnect: drain queue
  useEffect(() => {
    const handleOnline = () => {
      drainQueue().then(() => refreshPending())
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [refreshPending])

  const toggle = useCallback((playerId: string) => {
    setAttendance(prev => ({ ...prev, [playerId]: !prev[playerId] }))
    setSaved(false)
  }, [])

  const save = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      // 1. Write to IndexedDB queue first — guarantees the data is persisted
      await enqueue({ divisionId, date, attendance })
      await refreshPending()

      // 2. Attempt immediate network flush
      const ok = await flushItem(divisionId, date, attendance)
      if (ok) {
        await dequeue(`${divisionId}-${date}`)
        await refreshPending()
        setSaved(true)
      } else {
        // Item remains in queue; will drain on reconnect
        setError('Sin conexión — se guardará cuando haya red')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }, [attendance, divisionId, date, refreshPending])

  const presentCount = Object.values(attendance).filter(Boolean).length

  return { attendance, toggle, save, saving, saved, error, presentCount, pendingCount }
}
```

The existing callers of useAttendance (the attendance/new page) use destructuring — adding `pendingCount` to the return is backwards compatible; existing callers simply ignore it unless they destructure it.

If the attendance/new page component should show a pending indicator (e.g. "1 guardado pendiente"), add the pendingCount to the destructure in that component file and render a small indicator near the Save button. Check what the component looks like and add a minimal indicator if the file is straightforward. If it would require significant UI restructuring, leave it for a follow-up.
  </action>
  <verify>
1. npm run build — must pass (TypeScript will catch any type errors in the hook)
2. Chrome DevTools offline test: Application → Service Workers → Offline → toggle player → Save → should see error message "Sin conexión..." rather than a crash → uncheck Offline → pending indicator should clear and record appears in Supabase
  </verify>
  <done>
    - useAttendance.ts is refactored with queue-first save and drain-on-online
    - pendingCount is returned from the hook
    - npm run build passes
    - Manual offline test: data persists through a network dropout
  </done>
</task>

<task type="auto">
  <name>Task 7: Replace xlsx with exceljs to eliminate CVE-2024-22363</name>
  <files>
    src/app/api/attendance/[divisionId]/export/route.ts
    package.json
  </files>
  <action>
Run:
```bash
npm uninstall xlsx
npm install exceljs@4.4.0
```

Then rewrite `src/app/api/attendance/[divisionId]/export/route.ts`. Keep all data-fetching logic (Supabase queries, the lookup table build, playerTotals, header/rows/footerRow construction) exactly as-is. Only the Excel generation section changes.

Replace the xlsx section (currently lines 95-117) with the exceljs equivalent:

```typescript
import ExcelJS from 'exceljs'

// ... (all existing data-fetching code unchanged) ...

// Build wsData is unchanged: [header, ...rows, footerRow]

// --- REPLACE everything from "const ws = XLSX.utils..." to the end ---

const wb = new ExcelJS.Workbook()
const ws = wb.addWorksheet(division.name)

ws.addRows(wsData)

// Column widths
ws.getColumn(1).width = 30  // Jugador
ws.getColumn(2).width = 6   // Q
ws.getColumn(3).width = 12  // % Asistencia
for (let i = 4; i <= sessions.length + 3; i++) {
  ws.getColumn(i).width = 12
}

const buf = Buffer.from(await wb.xlsx.writeBuffer())

const filename = `presentismo_${division.name.replace(/\s+/g, '_')}.xlsx`

return new NextResponse(buf, {
  headers: {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${filename}"`,
  },
})
```

Critical note: `wb.xlsx.writeBuffer()` returns a Promise — it MUST be awaited. Wrap in `Buffer.from()` to ensure it is a Node.js Buffer for the NextResponse constructor. The existing route is already `async`, so this works without changes to the function signature.

Remove the `import * as XLSX from 'xlsx'` line and add `import ExcelJS from 'exceljs'`.

After uninstalling xlsx, verify it is gone from package.json dependencies.
  </action>
  <verify>
1. npm run build — must pass; no xlsx import should remain
2. Navigate to any division's attendance history and click the export button — the .xlsx file should download and open correctly in Excel/LibreOffice, showing the same column layout as before
  </verify>
  <done>
    - xlsx is removed from package.json
    - exceljs is in package.json dependencies at 4.4.0
    - Export route uses ExcelJS API exclusively
    - Downloaded file opens in Excel with correct player/session data
    - npm run build passes
  </done>
</task>

<task type="auto">
  <name>Task 8: Pin Supabase packages to peer-compatible versions</name>
  <files>
    package.json
  </files>
  <action>
Update package.json dependencies:

```json
"@supabase/ssr": "0.10.2",
"@supabase/supabase-js": "^2.102.1"
```

Change `@supabase/ssr` from `"^0.9.0"` to `"0.10.2"` (exact pin — no caret).
Change `@supabase/supabase-js` from `"^2.99.3"` to `"^2.102.1"`.

Then run:
```bash
npm install
```

The install should resolve without peer dependency warnings. If it does not, check `npm ls @supabase/supabase-js` to confirm the installed version is >= 2.102.1.

This is a low-risk change: `@supabase/ssr` 0.9.x → 0.10.x has no breaking changes (RESEARCH.md confirmed). The exact pin prevents future accidental upgrades to an untested version.
  </action>
  <verify>npm run build — must pass. Run `npm ls @supabase/ssr` to confirm version is exactly 0.10.2.</verify>
  <done>
    - package.json shows @supabase/ssr at exact "0.10.2"
    - package.json shows @supabase/supabase-js at "^2.102.1"
    - npm install completes without errors
    - npm run build passes
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
All security hardening and reliability changes:
- Shared guards module (src/lib/auth/guards.ts)
- assertAdmin() applied to 18 actions in sabados, buses, schools action files
- assertAdmin() applied to wiki write actions
- Geocode route now requires authentication (returns 401 for anonymous requests)
- Password minimum raised to 8 characters
- useAttendance hook: IndexedDB queue-first, drain on reconnect
- xlsx replaced with exceljs in export route
- @supabase/ssr pinned to 0.10.2
  </what-built>
  <how-to-verify>
**1. Coach cannot call admin actions (requires deploy to Vercel or local dev test):**
   - Log in as a coach account
   - In browser DevTools → Console, try calling a sabados action directly:
     Attempting to submit a form that posts to a sabados server action should fail
   - Expected: error thrown, not a successful DB mutation

**2. Geocode route requires auth:**
   - In an incognito window (not logged in), open DevTools → Network
   - Navigate to: https://vrc-presentismo.vercel.app/api/geocode?q=Buenos+Aires
   - Expected: HTTP 401 response

**3. Offline attendance queue (Chrome DevTools):**
   - Log in as a coach, open an attendance session (e.g. /attendance/[divisionId]/new)
   - DevTools → Application → Service Workers → check "Offline"
   - Toggle a player's attendance state
   - Click "Guardar" — the UI should show "Sin conexión — se guardará cuando haya red" (not a crash or blank)
   - Uncheck "Offline" in DevTools
   - Within a few seconds, the pending item should drain automatically
   - Verify in Supabase dashboard → Table Editor → attendance_records that the record exists

**4. Excel export works:**
   - Go to any division's attendance history page
   - Click the export button
   - A .xlsx file should download
   - Open it in Excel or LibreOffice Calc — should show player names, dates, P/A marks

**5. Build is clean:**
   ```
   npm run build
   ```
   Should complete with 0 TypeScript errors and 0 ESLint errors.

**Manual configuration steps to complete after verifying the above:**
   - Supabase Dashboard → Authentication → Providers → Email → Password Policy → set minimum to 8 characters
   - Vercel Dashboard → Security → Firewall → Add Rule → Path: /api/geocode → Rate Limit → Fixed Window, 60 seconds, 20 requests
  </how-to-verify>
  <resume-signal>Type "approved" when all checks pass, or describe any failures.</resume-signal>
</task>

</tasks>

<verification>

## Final Verification Checklist

Run this after all tasks complete, before marking the phase done:

```bash
# 1. Clean build
npm run build

# 2. xlsx is gone
grep -r "from 'xlsx'" src/ && echo "FAIL: xlsx still imported" || echo "OK: xlsx removed"

# 3. assertAdmin is not defined inline in any action file (must be imported from guards)
grep -r "async function assertAdmin" src/app && echo "FAIL: inline assertAdmin found" || echo "OK: assertAdmin not inline"

# 4. All 3 action files import from guards
grep -l "assertAdmin" src/app/\(app\)/admin/sabados/actions.ts src/app/\(app\)/admin/buses/actions.ts src/app/\(app\)/admin/schools/actions.ts

# 5. idb is in node_modules
ls node_modules/idb && echo "OK: idb installed" || echo "FAIL: idb missing"
```

## Production Testing Guide for Offline Queue

**Android (Chrome) — Full test with real hardware:**
1. Open https://vrc-presentismo.vercel.app in Chrome for Android
2. Tap menu (three dots) → "Add to Home Screen" → install as PWA
3. Open the PWA from the home screen (standalone mode — no browser chrome)
4. Navigate to an attendance session for a division you are assigned to
5. Enable Airplane Mode in Android settings
6. Toggle one or more players' attendance
7. Tap "Guardar" — the app should show the offline error message and NOT crash
8. Disable Airplane Mode
9. Within a few seconds, the pending indicator should clear
10. Check Supabase dashboard → Table Editor → attendance_records — the record should be present

**iPhone (Safari) — iOS path (online event only, no Background Sync):**
1. Open the app in Safari on iPhone
2. Tap Share → "Add to Home Screen" → install
3. Open from home screen
4. Enable Airplane Mode
5. Navigate to an attendance session, toggle players, tap Guardar
6. App should show offline message — this is correct
7. IMPORTANT: Keep the app open and in the foreground when you re-enable connectivity
   (iOS Background Sync is not supported — the drain fires via the 'online' event,
    which only fires while the PWA is open)
8. Re-enable WiFi/mobile data while the PWA is still on screen
9. The pending item drains automatically
10. Verify in Supabase dashboard

**Chrome DevTools (quickest — no device needed):**
1. Open the app in Chrome desktop
2. Log in as a coach account
3. Navigate to /attendance/[any-assigned-divisionId]/new
4. DevTools → Application → Service Workers → check "Offline"
5. Toggle players, click Guardar → should see "Sin conexión" message
6. Uncheck "Offline" → queue drains, savedstate updates
7. Check Supabase dashboard for the attendance_records rows
</verification>

<success_criteria>
- npm run build passes with zero errors after all tasks complete
- src/lib/auth/guards.ts exports assertAdmin and assertTutoraOrAdmin
- 18 actions across sabados/buses/schools each start with await assertAdmin()
- saveWikiPage and deleteWikiPage each start with await assertAdmin()
- /api/geocode returns 401 to unauthenticated requests (verified via curl or incognito)
- useAttendance saves to IndexedDB before attempting network; drains on reconnect
- xlsx package removed; exceljs used in export route; attendance export downloads correctly
- @supabase/ssr pinned to exact 0.10.2 in package.json
- Manual steps documented and communicated: Supabase Auth password policy (min 8) + Vercel Firewall rule for /api/geocode
</success_criteria>

<output>
After completion, create `.planning/phases/1-security-reliability/1-01-SUMMARY.md` using the summary template at `$HOME/.claude/get-shit-done/templates/summary.md`.
</output>
