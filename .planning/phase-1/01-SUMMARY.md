---
phase: "1-security-reliability"
plan: 01
subsystem: "auth, offline, deps"
tags: ["security", "authorization", "offline", "pwa", "dependencies"]
dependency_graph:
  requires: []
  provides:
    - "Shared auth guards module (assertAdmin, assertTutoraOrAdmin)"
    - "assertAdmin coverage on all 18 previously-unguarded admin server actions"
    - "Geocode proxy requires authenticated session"
    - "IndexedDB offline attendance queue with drain-on-online"
    - "xlsx replaced with exceljs (CVE-2024-22363 eliminated)"
    - "Supabase packages pinned to compatible versions"
  affects:
    - "All admin server action files"
    - "useAttendance hook consumers (pendingCount added to return)"
    - "Attendance export endpoint"
tech_stack:
  added:
    - "idb@8.0.2 — typed IndexedDB wrapper for offline queue"
    - "exceljs@4.4.0 — xlsx replacement, no known CVEs"
  patterns:
    - "Shared auth guard module pattern (src/lib/auth/guards.ts)"
    - "IndexedDB queue + window.online drain pattern for offline PWA"
key_files:
  created:
    - "src/lib/auth/guards.ts"
    - "src/lib/offline/attendanceQueue.ts"
  modified:
    - "src/app/(app)/admin/actions.ts"
    - "src/app/(app)/admin/sabados/actions.ts"
    - "src/app/(app)/admin/buses/actions.ts"
    - "src/app/(app)/admin/schools/actions.ts"
    - "src/app/(app)/wiki/actions.ts"
    - "src/app/(app)/tutoras/actions.ts"
    - "src/app/api/geocode/route.ts"
    - "src/lib/hooks/useAttendance.ts"
    - "src/app/api/attendance/[divisionId]/export/route.ts"
    - "package.json"
decisions:
  - "Wiki write actions use assertAdmin (not assertTutoraOrAdmin) — consistent with UI intent: only admins see edit controls"
  - "mergeSchools uses assertAdmin (not assertTutoraOrAdmin) — destructive operation, admin-only is safer"
  - "Offline queue key is divisionId-sessionDate enabling upsert semantics — retries are safe because API is idempotent"
  - "guards.ts has no 'use server' directive — it is a plain async module imported by server action files that already carry the directive"
  - "saveTercerTiempo now requires admin even for source='coach' path — plan specified all 12 sabados actions should be guarded"
metrics:
  duration: "~45 minutes"
  completed: "2026-04-11"
  tasks_completed: 8
  tasks_total: 8
  files_modified: 12
---

# Phase 1 Plan 01: Security + Reliability Hardening Summary

**One-liner:** Auth guard extraction to shared module + 18 server actions protected + geocode auth gate + IndexedDB offline queue for attendance + xlsx CVE replaced with exceljs.

## What Was Built

### Task 1 — Shared auth guards module
Created `src/lib/auth/guards.ts` exporting `assertAdmin()` and `assertTutoraOrAdmin()`. Extracted the private `assertAdmin` from `admin/actions.ts` and the exported `assertTutoraOrAdmin` from the same file. Both are now imported from the shared module. Updated `tutoras/actions.ts` import path.

### Task 2 — 18 unguarded admin actions protected
Added `await assertAdmin()` as the first line of all 12 actions in `sabados/actions.ts`, all 3 in `buses/actions.ts`, and all 3 in `schools/actions.ts`. Import added to each file.

### Task 3 — Wiki writes guarded + geocode secured
`saveWikiPage` and `deleteWikiPage` now call `assertAdmin()`. The geocode GET handler now calls `supabase.auth.getUser()` and returns 401 if no authenticated user is present.

### Task 4 — Password minimum length raised
Both `createCoach` and `createTutora` in `admin/actions.ts` now enforce `password.length < 8` with updated Spanish error message.

### Task 5 — IndexedDB attendance queue
Installed `idb@8.0.2`. Created `src/lib/offline/attendanceQueue.ts` with `QueuedAttendance` type and `enqueue`, `dequeue`, `getAllQueued`, `getPendingCount` functions. DB: `vrc-attendance-queue`, store: `pending`, version 1. Key is `${divisionId}-${sessionDate}` (upsert semantics).

### Task 6 — useAttendance hook with offline resilience
Refactored to: always enqueue to IndexedDB before attempting fetch; on success dequeue; on failure leave in queue with "Sin conexión" message. On mount and `window.online` event, drain all queued items. Added `pendingCount` to return value. Existing public API preserved.

### Task 7 — xlsx replaced with exceljs
Uninstalled `xlsx` (CVE-2024-22363 ReDoS). Installed `exceljs`. Rewrote `export/route.ts` using `ExcelJS.Workbook`, `wb.addWorksheet`, `ws.addRows`, `ws.getColumn(n).width`, and `await wb.xlsx.writeBuffer()`.

### Task 8 — Supabase packages pinned
`@supabase/ssr` pinned to exact `0.10.2`. `@supabase/supabase-js` updated to `^2.102.1` to satisfy the peer dep requirement of `@supabase/ssr@0.10.2`.

## Deviations from Plan

None — plan executed exactly as written. All 8 tasks completed in order with builds passing after each.

**Note on saveTercerTiempo:** The RESEARCH.md noted a question about whether `saveTercerTiempo` with `source='coach'` should be allowed for non-admins. The plan specified all 12 sabados actions should be guarded with `assertAdmin()`, which was implemented as specified. The `source='coach'` path is a coordinator-entered data field, not a separate coach action endpoint.

## Known Stubs

None — no placeholder data, hardcoded empty values, or TODO stubs introduced.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced. All changes either added guards to existing endpoints or replaced an internal library.

## Commits

| Task | Hash | Description |
|------|------|-------------|
| 1 | 6518266 | Create shared auth guards module and migrate assertTutoraOrAdmin |
| 2 | d2ff559 | Add assertAdmin() guard to 18 unguarded admin actions |
| 3 | b38a551 | Guard wiki writes and secure geocode proxy with auth check |
| 4 | ff9bfea | Raise password minimum length from 6 to 8 characters |
| 5 | 9242a0e | Install idb and create IndexedDB attendance queue |
| 6 | 8d9a603 | Refactor useAttendance hook with offline queue support |
| 7 | 13f743c | Replace xlsx with exceljs in attendance export route |
| 8 | d8ae568 | Pin Supabase packages to resolve peer dep version drift |

## Self-Check: PASSED

Files verified to exist:
- `src/lib/auth/guards.ts` — FOUND
- `src/lib/offline/attendanceQueue.ts` — FOUND
- `src/lib/hooks/useAttendance.ts` — FOUND (modified)
- `src/app/api/attendance/[divisionId]/export/route.ts` — FOUND (modified)

All 8 commits found in git log.

Final `npm run build` passed with zero TypeScript errors.
