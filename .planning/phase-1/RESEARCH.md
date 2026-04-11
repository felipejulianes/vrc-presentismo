# Phase 1: Security + Reliability Hardening - Research

**Researched:** 2026-04-11
**Domain:** Next.js 14 App Router security, PWA offline resilience, dependency risk
**Confidence:** HIGH (security patterns), MEDIUM (offline queue), MEDIUM (dependencies)

---

## Summary

This phase addresses three audit findings in the VRC Presentismo codebase: missing role-enforcement guards on admin server actions, no offline fallback for attendance saves, and dependency risk in three packages.

**Security gaps are real and exploitable today.** The `assertAdmin()` function exists and works correctly in `src/app/(app)/admin/actions.ts` — it just hasn't been applied to the sabados, buses, schools, and wiki action files. These files rely on RLS-only enforcement, which means any authenticated user who discovers the action endpoint (or calls it directly) can mutate data if RLS policies are too permissive, or bypass the intended UI-level access control. The fix is mechanical: import and call `assertAdmin()` (or `assertTutoraOrAdmin()` for wiki) at the top of each unguarded action.

**Offline attendance** is the most architecturally complex fix. Background Sync API is not supported on iOS Safari [VERIFIED: caniuse.com], which is the primary target device. The correct pattern is: IndexedDB queue in the client layer + `window.addEventListener('online')` retry as the cross-platform fallback, with Background Sync as a progressive enhancement for Chrome/Android only. The attendance API already uses upsert semantics [VERIFIED: codebase read] — repeat submissions are safe.

**Dependencies**: `xlsx 0.18.5` is unmaintained on npm and has a confirmed ReDoS CVE (CVE-2024-22363). `next-pwa 5.6.0` is archived; the maintained fork `@ducanh2912/next-pwa` (currently v10.2.9) or `serwist` are viable replacements. `@supabase/ssr ^0.9.0` is already at the latest stable (0.10.2) — the loose pin is fine, no breaking changes exist in this range.

**Primary recommendation:** Fix security guards first (lowest risk, highest impact), then replace xlsx with exceljs, then implement the offline queue, then evaluate PWA library migration as a separate lower-priority phase.

---

## Project Constraints (from CLAUDE.md)

- Stack: Next.js 14 App Router, TypeScript, Tailwind CSS, next-pwa, Supabase
- Clients: Server Components use `@/lib/supabase/server`, Client Components use `@/lib/supabase/client`, admin ops use `@/lib/supabase/admin` (service_role). Never import server.ts from a Client Component.
- Shared constants (used by both server and client) go in files with no Supabase imports (e.g., `src/lib/docs/constants.ts`).
- Colors: `vrc-green`, `vrc-orange`, `vrc-gold` — use Tailwind tokens.
- No branches/PRs — commit directly to main, Vercel auto-deploys.
- DB migrations run manually in Supabase SQL Editor.

---

## Category 1: Security Fixes

### 1.1 Missing assertAdmin Guards — Confirmed Scope

**Verified by codebase read.** The following files have `'use server'` but no role check:

| File | Actions | Risk Level |
|------|---------|------------|
| `admin/sabados/actions.ts` | `addOpponentClub`, `renameClub`, `toggleClubActive`, `saveDivisionActivity`, `deleteDivisionActivity`, `saveTercerTiempo`, `updateClubCoordinator`, `addVenue`, `updateVenue`, `updateVenueCoords`, `deleteVenue`, `saveTercerTiempoVisitors` | HIGH |
| `admin/buses/actions.ts` | `createBus`, `updateBus`, `toggleBusActive` | MEDIUM |
| `admin/schools/actions.ts` | `createSchool`, `updateSchool`, `mergeSchools` | HIGH — `mergeSchools` reassigns all players and deactivates a school |
| `wiki/actions.ts` | `saveWikiPage`, `deleteWikiPage` | MEDIUM |
| `api/geocode/route.ts` | GET handler | LOW (no auth, no mutating state, but can abuse Nominatim) |

Note: `saveDivisionActivity` in `sabados/actions.ts` fetches `user?.id` but performs no role check. The page at `/admin/sabados` is in the admin section and the route is guarded by layout redirect, but the **server action itself** is callable directly by any authenticated session.

### 1.2 The assertAdmin Pattern (from Codebase)

[VERIFIED: codebase read `src/app/(app)/admin/actions.ts`]

```typescript
// Private helper — NOT exported
async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') throw new Error('Sin permisos')
}

// Also available (already exported from admin/actions.ts):
export async function assertTutoraOrAdmin() {
  // ... checks for 'admin' | 'tutora' roles
  return { user, role: profile?.role as 'admin' | 'tutora' }
}
```

**Throw vs return for guards:** The existing codebase consistently uses `throw` for auth/role failures inside guard helpers and `return { error: ... }` for business-logic failures. This is intentional [CITED: nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations] — thrown errors trigger the nearest error boundary, returned errors are handled by the calling UI. Do not change this pattern. The guard helpers throw; the actions catch nothing from them and let the throw propagate.

### 1.3 Adding assertAdmin to Each File

Each unguarded file needs:
1. Import `createClient` from `@/lib/supabase/server` (already present in all files)
2. Copy the private `assertAdmin` function (it's private, not exported, so it cannot be shared via import without restructuring — copy-paste is the right call unless a shared helper module is created)
3. Call `await assertAdmin()` as the first line of each action

**Alternative:** Extract to `src/lib/auth/guards.ts` as a shared module. Both approaches work. The shared module approach is cleaner but requires a new file. Given the codebase uses copy-paste for `assertAdmin` already (it exists only in `admin/actions.ts` and is not importable by other action files), creating `src/lib/auth/guards.ts` is the correct architectural move.

Pattern for a shared guards file:

```typescript
// src/lib/auth/guards.ts
import { createClient } from '@/lib/supabase/server'

export async function assertAdmin(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') throw new Error('Sin permisos')
}

export async function assertTutoraOrAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!['admin', 'tutora'].includes(profile?.role)) throw new Error('Sin permisos')
  return { user, role: profile?.role as 'admin' | 'tutora' }
}
```

Then `admin/actions.ts` imports from there instead of defining its own private copy. The `assertTutoraOrAdmin` currently exported from `admin/actions.ts` would move to the shared file.

### 1.4 Wiki Role Question — Admin-only vs Admin+Tutora

[VERIFIED: codebase read `wiki/page.tsx`, `more/page.tsx`, `tutoras/layout.tsx`]

The wiki/reglamento page is accessible to ALL authenticated users via `/more` → `/wiki` (visible in the bottom nav "Más" section). The `wiki/page.tsx` checks `isAdmin` to show edit controls — coaches see the wiki read-only, only admins see edit/delete buttons in the UI.

The actions `saveWikiPage` and `deleteWikiPage` should be **admin-only**, consistent with the UI intent. The `tutora` role does not need wiki write access — tutoras manage school/player docs, not the rugby rulebook content.

**Recommendation:** Use `assertAdmin()` for both wiki actions.

### 1.5 Geocode Route — Rate Limiting

[VERIFIED: codebase read `api/geocode/route.ts`]

Current state: unauthenticated GET, no auth check, no rate limit. The route proxies to Nominatim (OpenStreetMap). Nominatim's usage policy [CITED: operations.osmfoundation.org/policies/nominatim/] requires max 1 req/sec and no bulk geocoding. Abuse of this endpoint could get the Vercel app's IP banned from Nominatim.

**Three approaches, ranked by implementation cost:**

**Option A — Auth check only (recommended for this phase):**
Add Supabase auth check at the top of the GET handler. This limits the endpoint to authenticated users only. Since the geocode feature is used in admin/coordinator venue management, requiring auth is appropriate and does not break any use case.

```typescript
// Add to geocode/route.ts GET handler:
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json([], { status: 401 })
```

The existing `next: { revalidate: 3600 }` cache already reduces repeated identical queries. Auth check alone closes the unauthenticated abuse vector.

**Option B — Vercel Firewall rate limit rule (no code change):**
[VERIFIED: vercel.com/kb/guide/add-rate-limiting-vercel] Vercel Firewall is available on all plans including free. In the Vercel dashboard: Security → Firewall → Add Rule → path matches `/api/geocode` → Rate Limit → Fixed Window (60 seconds, 20 requests). Zero code change required. Works at the edge before the Next.js function runs.

**Option C — In-memory lru-cache (code-based, stateful per-instance):**
[ASSUMED] Works in development/single-instance but unreliable on Vercel serverless because each invocation may be a different container. Not recommended for Vercel.

**Recommendation:** Option A (auth check) + Option B (Vercel Firewall rule) combined. Auth check prevents unauthenticated abuse; Vercel Firewall prevents authenticated users from hammering the endpoint. No external paid service needed.

### 1.6 Password Minimum Length

[VERIFIED: codebase read `admin/actions.ts` lines 43-45 and 86-88]

Current check: `if (password.length < 6)`. Supabase's minimum is 6 by default [ASSUMED — Supabase Auth defaults]. The minimum in the application validation should match or exceed Supabase's configured minimum. Industry standard (NIST SP 800-63B) recommends minimum 8 characters for user-chosen passwords.

**Recommendation:** Change both checks from `< 6` to `< 8`. Update error message to "La contraseña debe tener al menos 8 caracteres". No Supabase config change required unless Supabase's configured minimum is still 6 (check Supabase dashboard → Auth → Password policy).

**Outside-repo change:** If Supabase dashboard Auth settings have minimum password length set to 6, update it to 8 to match.

---

## Category 2: Offline Attendance Queue

### 2.1 Attendance API — Upsert Confirmation

[VERIFIED: codebase read `src/app/api/attendance/route.ts`]

The API uses upsert in two places:
```typescript
// training_sessions — upsert on (division_id, session_date)
supabase.from('training_sessions').upsert(
  { division_id, session_date, created_by: user.id },
  { onConflict: 'division_id,session_date' }
)

// attendance_records — upsert on (session_id, player_id)
supabase.from('attendance_records').upsert(records, { onConflict: 'session_id,player_id' })
```

**The API is fully idempotent.** Submitting the same attendance payload twice produces the same result. Background sync retries are safe without any API changes.

### 2.2 Background Sync API — Browser Support Reality

[VERIFIED: caniuse.com, April 2026]

| Browser | Support |
|---------|---------|
| Chrome (desktop + Android) | YES — since v49 |
| Edge | YES — since v79 |
| Samsung Internet | YES — since v5 |
| Safari (macOS) | NO |
| iOS Safari | NO — all versions |
| Firefox | NO |

**Global support: ~76%** — but critically, iOS Safari has zero support across all versions. Since VRC Presentismo coaches use the app as a PWA on mobile phones in Argentina, and the iPhone market share in Argentina is significant, designing exclusively around Background Sync is not viable.

### 2.3 Recommended Architecture: Layered Offline Queue

[CITED: rishikc.com/articles/advanced-pwa-features-offline-push-background-sync/]

The pattern: **IndexedDB queue is the source of truth; Background Sync is an optimization where available; `window.addEventListener('online')` is the universal fallback.**

```
User taps Save
    ↓
Write to IndexedDB queue (always — even if online)
    ↓
Attempt fetch immediately
    ├── Success → remove from IndexedDB queue, set saved=true
    └── Failure (offline or error)
            ↓
        Register Background Sync tag (if API supported)
        window.addEventListener('online', drainQueue) (always registered)
            ↓
        User comes back online
            ↓
        drain() reads IndexedDB, retries all queued items
```

### 2.4 IndexedDB Queue Implementation

**Key design decisions:**
- Store queue items as: `{ id, divisionId, date, attendance, queuedAt, attempts }`
- Use a library like `idb` (tiny, typed wrapper around IndexedDB) — avoids raw IndexedDB verbosity
- Queue is in the **client hook** (`useAttendance.ts`), not the service worker — simpler to implement and debug
- The hook drain function runs on `window.addEventListener('online')` and on hook mount (to drain any previous-session items)

**Package to add:**

```bash
npm install idb
```

[VERIFIED: npm view idb version → 8.0.2] `idb` is actively maintained, 2KB gzipped, typed, zero dependencies. [ASSUMED: exact install works with Next.js 14 client components — no known incompatibility]

**Minimal queue implementation sketch** (for planner reference):

```typescript
// src/lib/offline/attendanceQueue.ts
import { openDB } from 'idb'

const DB_NAME = 'vrc-offline'
const STORE = 'attendance-queue'

export interface QueuedAttendance {
  id: string       // `${divisionId}-${date}`
  divisionId: string
  date: string
  attendance: Record<string, boolean>
  queuedAt: number
}

export async function enqueue(item: Omit<QueuedAttendance, 'id' | 'queuedAt'>) { ... }
export async function dequeue(id: string) { ... }
export async function getAllQueued(): Promise<QueuedAttendance[]> { ... }
```

### 2.5 next-pwa Integration for Background Sync

[VERIFIED: github.com/shadowwalker/next-pwa README]

`next-pwa 5.6.0` supports `swSrc` option: when specified, it uses Workbox's `InjectManifest` plugin instead of `GenerateSW`. This allows a custom service worker file to receive the precache manifest injected but add its own logic.

**How to add Background Sync to next-pwa without breaking existing config:**

1. Create `src/sw-custom.js` (or `public/sw-custom.js`)
2. Set `swSrc: 'src/sw-custom.js'` in `next.config.mjs` pwaConfig
3. The custom SW file imports workbox modules and adds a Background Sync queue

```javascript
// src/sw-custom.js
import { BackgroundSyncPlugin } from 'workbox-background-sync'
import { NetworkOnly } from 'workbox-strategies'
import { registerRoute } from 'workbox-routing'
import { precacheAndRoute } from 'workbox-precaching'

// Required: inject precache manifest (next-pwa will inject this)
precacheAndRoute(self.__WB_MANIFEST)

const bgSyncPlugin = new BackgroundSyncPlugin('attendance-queue', {
  maxRetentionTime: 24 * 60, // 24 hours in minutes
})

registerRoute(
  ({ url }) => url.pathname === '/api/attendance',
  new NetworkOnly({ plugins: [bgSyncPlugin] }),
  'POST'
)
```

**Caution:** This is additive — the existing `runtimeCaching` rules in `next.config.mjs` (CacheFirst for photos, NetworkFirst for Supabase data) still work. The `swSrc` approach merges them.

**However:** The Background Sync registered in the service worker only fires on Chrome/Android. On iOS it is ignored. The IndexedDB + `online` event approach in the client hook is still required as the primary mechanism.

### 2.6 iOS-Specific Limitations

[VERIFIED: caniuse.com, magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide]

- iOS Safari: no Background Sync API
- iOS PWA storage limit: ~50MB, can be evicted if app unused
- IndexedDB on iOS has had historical instability (transaction failures, data loss in older iOS versions) — modern iOS 16+ is stable
- iOS 17.4+ in EU: Apple restricted standalone PWA mode under DMA, but Argentina is not affected

**Practical implication for VRC Presentismo:** The `window.addEventListener('online')` drain must work correctly because it is the ONLY mechanism that will fire on iPhones.

### 2.7 What Changes Outside the Repo

| Item | Required | Details |
|------|----------|---------|
| Supabase config | None | API is already idempotent; no schema changes needed |
| Vercel config | None | No environment variables needed; service workers work on Vercel |
| Environment variables | None | No new variables |
| Vercel Firewall rule | Recommended | Rate limit `/api/geocode` (separate from offline queue) |
| Supabase Auth password policy | Recommended | Update minimum from 6 → 8 chars in dashboard |

### 2.8 Production Testing Procedure for Offline Queue

**Chrome DevTools (easiest):**
1. Open app in Chrome, go to attendance page for a division
2. DevTools → Application → Service Workers → check "Offline"
3. Toggle a player's attendance
4. Click Save — should show pending/queued state
5. Uncheck "Offline" → queue should drain automatically
6. Verify in Supabase table editor that attendance_records updated

**Lighthouse PWA audit:**
```bash
npx lighthouse https://vrc-presentismo.vercel.app/attendance/[divisionId]/new \
  --only-categories=pwa --output=json
```

**Real device (Android Chrome):**
1. Install PWA on Android (Add to Home Screen)
2. Enable airplane mode
3. Navigate to attendance, make changes, save
4. Observe UI state (should show "pendiente" not error)
5. Disable airplane mode → verify sync fires

**Real device (iPhone Safari):**
1. Install PWA (Add to Home Screen)
2. Enable airplane mode
3. Navigate to attendance, make changes, save
4. Re-enable airplane mode → app must still be OPEN (Background Sync won't fire when app is closed on iOS)
5. Verify drain fires via `online` event
6. Check Supabase dashboard for record

**Background Sync DevTools test (Chrome only):**
DevTools → Application → Background Sync → register an event manually to trigger replay.

---

## Category 3: Dependency Risks

### 3.1 xlsx 0.18.5

[VERIFIED: npm view xlsx version → 0.18.5; security.snyk.io/package/npm/xlsx]

**Status:** The `xlsx` package on npm is frozen at 0.18.5. SheetJS Pro continues development but is not published to npm. CVE-2024-22363 (ReDoS) is confirmed for this version. No patch available on npm.

**Usage in codebase:** Only `src/app/api/attendance/[divisionId]/export/route.ts`. The API surface used:
```typescript
XLSX.utils.aoa_to_sheet(wsData)
XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, sheetName)
XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
// Also: ws['!cols'] for column widths
```

**Replacement: exceljs 4.4.0** [VERIFIED: npm view exceljs version → 4.4.0]

ExcelJS is actively maintained, has no known high-severity CVEs, and covers the same use case. API surface mapping:

| xlsx call | exceljs equivalent |
|-----------|-------------------|
| `XLSX.utils.book_new()` | `new ExcelJS.Workbook()` |
| `XLSX.utils.aoa_to_sheet(data)` | `wb.addWorksheet(name)` then `ws.addRows(data)` |
| `XLSX.utils.book_append_sheet(wb, ws, name)` | Sheets are added directly to workbook |
| `XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })` | `await wb.xlsx.writeBuffer()` |
| `ws['!cols'] = [{ wch: 30 }]` | `ws.getColumn(1).width = 30` |

**Migration complexity:** LOW. The export route is self-contained. The rewrite is ~50 lines. No other files import xlsx.

**exceljs writes streams/buffers natively**, which is compatible with `new NextResponse(buf, ...)` pattern already in use.

### 3.2 next-pwa 5.6.0

[VERIFIED: npm view next-pwa version → 5.6.0; npm view @ducanh2912/next-pwa version → 10.2.9; npm view serwist version → 9.5.7]

**Status:** `next-pwa` (shadowwalker) is archived — last npm publish was 2022. It works with Next.js 14 App Router via the Pages Router compatibility path, which is why it still functions. It is not officially broken, just unmaintained.

**Two migration options:**

**Option A: @ducanh2912/next-pwa (v10.2.9)**
[CITED: ducanh-next-pwa.vercel.app/docs/next-pwa/configuring]
- Drop-in replacement for next-pwa with minimal config changes
- Supports Next.js 14 App Router natively
- Maintains similar `runtimeCaching` API
- Migration: change import, update package name, minor config adjustments
- `swSrc` option works the same way

**Option B: serwist / @serwist/next (v9.5.7)**
[CITED: serwist.pages.dev/docs/next/getting-started]
- Architecturally different — service worker goes in `app/sw.ts`, not `public/`
- Requires moving from `next.config.mjs` runtime caching to TypeScript SW file
- More powerful and better aligned with Next.js App Router conventions
- Higher migration complexity — config is completely different

**Migration complexity assessment:**

| Aspect | @ducanh2912/next-pwa | serwist |
|--------|----------------------|---------|
| Config changes | Minimal (import rename + small tweaks) | Significant (new SW file, new config structure) |
| runtimeCaching migration | Copy-paste, same API | Rewrite in TypeScript SW file |
| Custom SW (Background Sync) | swSrc option works same | TypeScript SW file is the primary entry point |
| Risk of breaking existing PWA | LOW | MEDIUM |

**Recommendation:** This migration is not a hard requirement for this phase. The current `next-pwa 5.6.0` setup is functional and not broken. Defer PWA library migration to a future phase. If implementing the Background Sync custom SW, use `swSrc` with `next-pwa` as-is. If/when migrating, prefer `@ducanh2912/next-pwa` for lower risk.

### 3.3 @supabase/ssr ^0.9.0

[VERIFIED: npm view @supabase/ssr dist-tags → latest: 0.10.2; codebase package.json]

**Status:** `^0.9.0` resolves to `0.10.2` (current latest). The caret range means the installed version IS the latest. No action required.

**Peer dependency note:** `@supabase/ssr@0.9.0` requires `@supabase/supabase-js ^2.97.0`. `@supabase/ssr@0.10.2` requires `@supabase/supabase-js ^2.102.1`. The project has `@supabase/supabase-js ^2.99.3` which may not satisfy `^2.102.1` exactly depending on what is installed.

**Recommendation:** Run `npm install` to let npm resolve the peer dep tree. Pin `@supabase/ssr` to exact `0.10.2` and `@supabase/supabase-js` to `^2.102.1` or exact `2.103.0` (current latest [VERIFIED: npm view @supabase/supabase-js version → 2.103.0]).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IndexedDB queue management | Custom raw IndexedDB wrapper | `idb` package | Raw IndexedDB API is verbose; idb is typed and handles transactions |
| Excel file generation | Custom XLSX byte writer | `exceljs` | Binary format complexity; exceljs handles all edge cases |
| Rate limiting state | In-memory Map with timestamps | Vercel Firewall + auth check | Serverless containers are ephemeral; shared state requires Redis |
| Role-checking logic | Per-file copy of auth logic | Shared `src/lib/auth/guards.ts` | DRY, single place to update if role model changes |

---

## Architecture Patterns

### Auth Guard Pattern (Server Actions)

```typescript
// src/lib/auth/guards.ts — NEW FILE
'use server'  // or no directive — it's called from server actions
import { createClient } from '@/lib/supabase/server'

export async function assertAdmin(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Sin permisos')
}

// Usage in action files:
export async function createBus(formData: FormData) {
  await assertAdmin()  // throws → propagates to error boundary
  // ... rest of action
}
```

### Offline Queue Hook Pattern

```typescript
// Modified useAttendance.ts approach:
const save = useCallback(async () => {
  setSaving(true)
  setError(null)
  try {
    // 1. Enqueue in IndexedDB first (guarantees persistence)
    await enqueue({ divisionId, date, attendance })
    // 2. Attempt immediate flush
    await drainQueue()
    setSaved(true)
  } catch (e) {
    // Item is in IndexedDB — will retry on 'online'
    setError('Sin conexión — se guardará cuando haya red')
  } finally {
    setSaving(false)
  }
}, [attendance, divisionId, date])
```

---

## Common Pitfalls

### Pitfall 1: Importing server-side guard from Client Component
**What goes wrong:** `src/lib/auth/guards.ts` imports `createClient` from `@/lib/supabase/server`. If any Client Component accidentally imports from this file, the build fails with a server-only boundary violation.
**How to avoid:** Do not export the guards file from any barrel that Client Components import. The file is only called from `'use server'` action files.
**Warning signs:** Build error mentioning "server-only" or "cannot be used in a client component context"

### Pitfall 2: Background Sync fires after service worker update
**What goes wrong:** When the service worker updates, queued sync events may not fire if the old SW is replaced before they drain.
**How to avoid:** The IndexedDB queue in the client is the authoritative source; SW sync is supplementary. If SW updates wipe the Background Sync queue, the `online` event listener still drains the IndexedDB queue.

### Pitfall 3: idb IndexedDB schema migrations
**What goes wrong:** Opening the IndexedDB with a new schema version without handling upgrades causes errors for users with existing installations.
**How to avoid:** Always provide an `upgrade` callback in `openDB` calls. Version the DB incrementally.

### Pitfall 4: exceljs async API vs xlsx sync API
**What goes wrong:** `xlsx.write()` is synchronous; `exceljs` uses Promises. The export route uses `await` already but the specific buffer write call must change from sync to `await wb.xlsx.writeBuffer()`.
**How to avoid:** The entire route handler is already `async`. Just ensure `await` is used on the buffer write.

### Pitfall 5: Supabase peer dep version drift
**What goes wrong:** `@supabase/ssr@0.10.2` requires `@supabase/supabase-js ^2.102.1` but package.json has `^2.99.3`. npm may not upgrade automatically without running `npm install` with the updated version range.
**How to avoid:** Update package.json explicitly: `"@supabase/supabase-js": "^2.102.1"` and run `npm install`.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `next-pwa` (shadowwalker, archived) | `@ducanh2912/next-pwa` or `serwist` | next-pwa still works but no security patches |
| `xlsx` community edition | `exceljs` (actively maintained) | CVE-2024-22363 in xlsx; exceljs has no current high CVEs |
| Background Sync only for offline | IndexedDB queue + `online` event + Background Sync as enhancement | Required because iOS Safari lacks Background Sync |
| Per-file auth logic copy | Shared guards module | DRY, consistent |

---

## Open Questions

1. **Does `mergeSchools` need admin-only or admin+tutora?**
   - What we know: tutoras manage schools (`/tutoras/schools/`), but `mergeSchools` is destructive (reassigns all players + deactivates source school)
   - What's unclear: whether tutoras should be able to merge schools or only admins
   - Recommendation: default to `assertAdmin()` (admin-only) for the destructive merge operation; tutoras can still use the regular update school path

2. **Does `saveDivisionActivity` also need to check coach access?**
   - What we know: coaches declare `source='coach'` in `saveTercerTiempo`, not in `saveDivisionActivity` — division activities are admin/coordinator only
   - What's unclear: whether any non-admin role should be able to call `saveDivisionActivity`
   - Recommendation: `assertAdmin()` on all sabados actions

3. **Is there an assertAdmin import in admin/actions.ts that breaks if we move to shared guards?**
   - What we know: `assertTutoraOrAdmin` is currently exported from `admin/actions.ts` and may be imported by other files
   - Investigation needed: grep for `assertTutoraOrAdmin` imports across the codebase before moving it

4. **IndexedDB store name collision with existing SW caches**
   - What we know: next-pwa generates `player-photos` and `supabase-data` cache names in the SW
   - What's unclear: whether idb DB name `vrc-offline` conflicts with anything
   - Recommendation: use a unique DB name, no conflict expected

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build | Yes | v24.14.0 | — |
| npm | Package install | Yes | bundled with Node | — |
| Supabase cloud | All DB operations | Yes (cloud) | — | — |
| Vercel | Deployment | Yes (cloud) | — | — |
| Vercel Firewall | Geocode rate limit | Yes — all plans free [VERIFIED: vercel.com/kb] | — | Auth-check only |

---

## What Requires Changes Outside the Repo

| Change | Where | Priority | Details |
|--------|-------|----------|---------|
| Password minimum length | Supabase Dashboard → Auth → Password Policy | MEDIUM | Update from 6 to 8 characters to match code change |
| Geocode rate limit rule | Vercel Dashboard → Security → Firewall | LOW | Add rule: path `/api/geocode`, Fixed Window, 60s/20 req |

No Supabase schema migrations required for this phase. No new environment variables required.

---

## Validation Architecture

Test framework: Playwright (already in devDependencies v1.59.1).

| Requirement | Test Type | Approach |
|-------------|-----------|---------|
| assertAdmin blocks non-admin | Integration | Manual: log in as coach, attempt to call action via fetch — expect 500 or error |
| Wiki delete blocked for coach | Integration | Manual: coach session, call deleteWikiPage action |
| Geocode requires auth | Smoke | `curl https://vrc-presentismo.vercel.app/api/geocode?q=Buenos+Aires` → expect 401 |
| Attendance offline queue drains | Manual + DevTools | Chrome offline simulation per testing procedure §2.8 |
| Excel export with exceljs | Smoke | Download export from `/api/attendance/[divisionId]/export` → verify file opens in Excel |
| npm build passes | Build check | `npm run build` after each change |

---

## Sources

### Primary (HIGH confidence)
- Codebase read: `src/app/(app)/admin/actions.ts` — assertAdmin pattern, password length
- Codebase read: `src/app/api/attendance/route.ts` — upsert semantics confirmed
- Codebase read: `src/app/(app)/wiki/actions.ts`, `wiki/page.tsx`, `more/page.tsx` — wiki role analysis
- Codebase read: `next.config.mjs`, `package.json` — current dependency versions
- [caniuse.com/background-sync](https://caniuse.com/background-sync) — Background Sync browser support
- [npm registry](https://www.npmjs.com) — package versions: @supabase/ssr 0.10.2, exceljs 4.4.0, idb 8.0.2, serwist 9.5.7, @ducanh2912/next-pwa 10.2.9
- [serwist.pages.dev/docs/next/getting-started](https://serwist.pages.dev/docs/next/getting-started) — serwist migration guide

### Secondary (MEDIUM confidence)
- [security.snyk.io/package/npm/xlsx](https://security.snyk.io/package/npm/xlsx) — CVE-2024-22363 confirmed
- [vercel.com/kb/guide/add-rate-limiting-vercel](https://vercel.com/kb/guide/add-rate-limiting-vercel) — Vercel Firewall free on all plans
- [rishikc.com/articles/advanced-pwa-features-offline-push-background-sync](https://rishikc.com/articles/advanced-pwa-features-offline-push-background-sync/) — IndexedDB + online event pattern
- [magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) — iOS PWA limitations
- [nextjs.org/docs/14/app/building-your-application/data-fetching/server-actions-and-mutations](https://nextjs.org/docs/14/app/building-your-application/data-fetching/server-actions-and-mutations) — throw vs return pattern

### Tertiary (LOW confidence / ASSUMED)
- Supabase Auth default password minimum is 6 characters [ASSUMED — not verified in this session against Supabase dashboard]
- `idb` package works cleanly with Next.js 14 App Router client components [ASSUMED]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Supabase Auth default password minimum is 6 characters | §1.6 | If already set to 8, the code change is still correct but the dashboard recommendation is unnecessary |
| A2 | `idb` 8.0.2 has no known incompatibility with Next.js 14 App Router client components | §2.4 | If incompatible, would need raw IndexedDB or a different wrapper |
| A3 | Argentina iPhone users represent a significant portion of VRC coaches using the PWA | §2.6 | If all coaches use Android, iOS-specific fallback is less critical but still correct to implement |

---

## Metadata

**Confidence breakdown:**
- Security fixes: HIGH — patterns verified in codebase, assertAdmin exists and works
- Offline queue: MEDIUM — architecture is well-established but exact idb integration needs implementation validation
- Dependencies: HIGH — versions verified against npm registry, CVE verified against Snyk

**Research date:** 2026-04-11
**Valid until:** 2026-07-11 (stable domain — 90 days; npm versions should be re-verified before execution)
