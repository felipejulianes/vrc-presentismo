# Technical Concerns

**Analysis Date:** 2026-04-11

---

## Security

**Missing authorization checks in several server actions:**
- `src/app/(app)/admin/sabados/actions.ts` — All sabados actions (`saveDivisionActivity`, `deleteDivisionActivity`, `saveTercerTiempo`, `saveTercerTiempoVisitors`, `addOpponentClub`, `renameClub`, `toggleClubActive`, `addVenue`, `updateVenue`, `deleteVenue`, `updateClubCoordinator`) call `createClient()` with the user's session but do NOT call `assertAdmin()`. They rely on Supabase RLS to block unauthorized writes, but if RLS policies on `division_activities`, `tercer_tiempo_reports`, `tercer_tiempo_visitors`, `opponent_clubs`, `club_venues` are permissive, any authenticated user can call these.
- `src/app/(app)/admin/buses/actions.ts` — Same pattern: `createBus`, `updateBus`, `toggleBusActive` do not assert admin role in application code.
- `src/app/(app)/admin/schools/actions.ts` — `createSchool`, `updateSchool`, `mergeSchools` do not assert admin or tutora role before executing writes. `mergeSchools` is particularly risky as it bulk-reassigns all players of one school and deactivates the source.
- `src/app/(app)/wiki/actions.ts` — `saveWikiPage` and `deleteWikiPage` check that the user is authenticated (via `user?.id`) but do not assert any role. Any coach can create or delete wiki pages if RLS allows it.

**Defense-in-depth depends entirely on Supabase RLS for these surfaces.** The admin layout guard (`src/app/(app)/admin/layout.tsx`) protects the UI, but server actions are callable directly via HTTP POST. Role enforcement should be explicit in the action itself.

**Player deactivation is client-side only:**
- `src/components/players/PlayerForm.tsx` — `handleDeactivate()` calls `supabase.from('players').update({ active: false })` directly from the browser using the anon client. This bypasses any server-side logging or audit trail.

**Geocode API has no rate limiting:**
- `src/app/api/geocode/route.ts` — Proxies queries to Nominatim (OpenStreetMap) with no authentication or rate-limit check. An unauthenticated user who reaches this endpoint can flood Nominatim, potentially getting the app's IP banned. The middleware does not protect API routes that don't require auth tokens beyond session cookies.

**Password minimum length is only 6 characters:**
- `src/app/(app)/admin/actions.ts` lines 44, 96 — `if (password.length < 6)` is the only password policy enforced when creating coaches/tutoras.

---

## Performance

**N+1 query patterns in stats queries:**
- `src/lib/queries/stats.ts` — `getSessionTrend()` fetches sessions, then fetches all attendance_records for those session IDs. `getDivisionKpis()` fetches sessions, then fetches records. `getAdminKpis()` fetches all divisions, then sessions, then records in three sequential round trips. At scale (many sessions or divisions), this becomes slow.
- `src/lib/queries/stats.ts` — `getAdminTrendData()` fetches all sessions without an upper date bound, then all attendance records for those sessions. As training history grows this query grows unboundedly.

**Excel export loads all sessions and all records into memory:**
- `src/app/api/attendance/[divisionId]/export/route.ts` — Loads every training session and every attendance record for a division, builds JavaScript arrays, then generates an xlsx buffer. For a division with 3 years of weekly sessions (150+ sessions × 30 players = 4500+ records), this is a large in-memory operation with no pagination or streaming.

**Player detail page fires 5 concurrent queries:**
- `src/app/(app)/players/[playerId]/page.tsx` lines 59–73 — `Promise.all` with stats, followups, notes, interviews, and schools. For tutora/admin roles, all five queries execute on every page render (no caching).

**PWA service worker caches Supabase REST responses for 1 hour:**
- `next.config.mjs` — `NetworkFirst` with `networkTimeoutSeconds: 10` and `maxAgeSeconds: 3600`. Stale data (players, sessions) can be served from cache for up to 1 hour after a network failure.

---

## Technical Debt

**Widespread `any` type casts suppress TypeScript safety:**
- `src/lib/queries/players.ts` line 56 — `(p: any)` when mapping Supabase join results
- `src/lib/queries/interviews.ts` lines 20, 47 — `(r: any)` for interview query results
- `src/lib/queries/docs.ts` line 67 — `(p: any)` for doc query results
- `src/lib/queries/schoolVisits.ts` lines 25, 63, 98 — `any[]` casts for join results
- `src/app/(app)/admin/coaches/page.tsx` lines 23, 26, 79, 94 — `any` for user and coach_division rows

Root cause: Supabase's TypeScript client returns `any` for complex join shapes (`.select('*, divisions(*)')`). The proper fix is to generate types from the DB schema using Supabase CLI (`supabase gen types typescript`) and use them.

**Dual `colegio` / `school_id` fields on players:**
- `src/types/index.ts` — The `Player` type has both `colegio: string | null` (free-text) and `school_id: string | null` (FK to `schools` table). These are kept in sync manually in `addInterview`, `createInterviewFromTutoras`, `updatePlayerGradoColegio`, and `PlayerForm`. This dual-write pattern is fragile; a missed sync leaves inconsistent data.

**Hardcoded division name strings for filtering:**
- `src/lib/queries/stats.ts` lines 5, 281, 283 — `const JUVENILE_NAMES = ['M15', 'M16', 'M17', 'M19', 'alumni']` and inline SQL string `"M15","M16","M17","M19","alumni"`. Division names are also hardcoded in the DB seed (`003_seed_divisions.sql`). Any rename or addition of a division requires code changes in multiple places.

**`opponent_club_ids` and `opponent_club_id` parallel fields:**
- `src/app/(app)/admin/sabados/actions.ts` line 54 — `const opponent_club_id = opponent_club_ids[0] ?? null  // first club kept for backwards compat`. Two fields exist on `division_activities` for the same data. This is legacy debt from migration 013 adding multi-opponent support.

**Migration management is manual:**
- `supabase/migrations/` has 32 migrations run manually via SQL Editor. There is no CLI-based migration runner, no CI check that migrations have been applied, and no way to verify the local schema matches production.

---

## Missing Features / TODOs

**Offline queue for attendance is not implemented:**
- CLAUDE.md explicitly marks "Offline queue para asistencia" as pending. The PWA caches data but `useAttendance` in `src/lib/hooks/useAttendance.ts` makes a live `fetch('/api/attendance', ...)` with no offline fallback. If the network is unavailable during attendance-taking, data is lost.

**Custom PWA icons are pending:**
- CLAUDE.md marks "Íconos PWA personalizados" as pending. `public/icons/icon-192.png` and `public/icons/icon-512.png` exist but are noted as not yet using the club's actual logo.

**No confirmation or undo for destructive operations:**
- Annual progression (`execute_annual_progression`) is marked irreversible in CLAUDE.md. `src/components/admin/ProgressionPreview.tsx` shows a preview, but there is no double-confirmation step enforced in code.
- School merge (`mergeSchools` in `src/app/(app)/admin/schools/actions.ts`) bulk-reassigns players with no undo mechanism.
- Player deactivation (`handleDeactivate` in `src/components/players/PlayerForm.tsx`) uses `confirm()` (browser dialog) as the only safeguard, which is bypassed on some mobile browsers.

**Wiki has no role-based write guard:**
- `src/app/(app)/wiki/actions.ts` — Any authenticated user (including coaches) can save or delete wiki pages. No UI guard is visible, but no server-side role check exists either.

**Settings page is a stub:**
- `src/app/(app)/settings/page.tsx` exists but its scope and completion status are unknown without reading it.

---

## Dependency Risks

**`next-pwa` is unmaintained:**
- `package.json` — `"next-pwa": "^5.6.0"`. The `next-pwa` package has not been updated since 2022 and its maintainer archived it. It does not officially support Next.js 14 App Router. It still works via the Pages Router compatibility path in `next.config.mjs`, but may break on future Next.js upgrades. Alternative: `@ducanh2912/next-pwa` or `serwist`.

**`xlsx` package is the SheetJS community edition:**
- `package.json` — `"xlsx": "^0.18.5"`. SheetJS moved its actively maintained releases to a private registry. The `^0.18.5` version on npm has known security advisories and is no longer updated. The export feature at `src/app/api/attendance/[divisionId]/export/route.ts` depends on this.

**`@supabase/ssr` version pinned loosely:**
- `"@supabase/ssr": "^0.9.0"` — This package has breaking changes between minor versions. Loose pinning (`^`) could cause unexpected breakage on `npm install` if a breaking 0.x release lands.

**No testing infrastructure:**
- `package.json` has `playwright` in devDependencies but no test scripts, no test files found in the codebase, and no CI configuration. Changes cannot be validated automatically before deployment.

---

## Code Quality

**Inconsistent authorization pattern across server actions:**
- Admin-scoped actions in `src/app/(app)/admin/actions.ts` consistently call `assertAdmin()`.
- Admin-adjacent actions in `src/app/(app)/admin/sabados/actions.ts` and `src/app/(app)/admin/buses/actions.ts` do not.
- This makes the security surface unpredictable for future contributors.

**`any` types on Supabase join shapes are pervasive** (see Technical Debt section). The codebase has no generated DB types, which means the TypeScript compiler cannot catch column name typos or schema changes.

**Date formatting is duplicated:**
- `formatDate` (parse `YYYY-MM-DD` → `DD/MM/YYYY`) is defined inline in `src/app/(app)/players/[playerId]/page.tsx` (line 18) and also independently in `src/components/players/FollowupLog.tsx` (line 30). A shared utility in `src/lib/utils/dates.ts` exists but these components do not use it.

**`SchoolsMatrixView.tsx` is the largest single file at 674 lines:**
- `src/components/tutoras/SchoolsMatrixView.tsx` — A single client component handling the full tutoras school matrix. It is a candidate for decomposition.

**`SabadoSetupGrid.tsx` is 582 lines:**
- `src/components/admin/SabadoSetupGrid.tsx` — Handles the full Saturday event setup UI. Complex state management mixed with rendering.

**No error boundary components:**
- None found in the codebase. Server Component errors propagate to Next.js default error pages. Client Component errors are unhandled (no `<ErrorBoundary>`).

---

## Scalability

**Stats queries aggregate at application level:**
- `src/lib/queries/stats.ts` — `getSessionTrend`, `getDivisionKpis`, `getAdminKpis`, and `getAdminTrendData` fetch raw attendance records to JavaScript and aggregate in-process. PostgreSQL-side aggregation (via RPC functions) already exists for per-player stats (`get_attendance_stats_*`) but is not used for the admin trend/KPI queries.

**Excel export is unbounded:**
- As noted in Performance, `src/app/api/attendance/[divisionId]/export/route.ts` loads all historical records. No year filter or row limit exists. A division active for 3+ seasons would generate a very wide spreadsheet.

**Photo storage has no size validation:**
- `src/components/players/PlayerForm.tsx` — Photo blobs are uploaded directly from the camera capture component. No client-side or server-side file size check exists before calling Supabase Storage. Large photos (from high-res cameras) are uploaded as-is.

**Single Supabase project for all environments:**
- Based on CLAUDE.md, there is one Supabase instance. Development and production share the same database. Schema changes run via SQL Editor on the production DB. No staging environment.

---

## Recommended Priorities

**High — Security:**
1. Add explicit `assertAdmin()` calls to all server actions under `/admin/` that currently lack them: `src/app/(app)/admin/sabados/actions.ts`, `src/app/(app)/admin/buses/actions.ts`, `src/app/(app)/admin/schools/actions.ts`.
2. Add role check to `src/app/(app)/wiki/actions.ts` (restrict writes to admin or tutora).
3. Add rate limiting or authentication requirement to `src/app/api/geocode/route.ts`.

**High — Reliability:**
4. Implement offline queue for attendance saves (`src/lib/hooks/useAttendance.ts`) — the core use case of the app fails silently without network.
5. Replace `next-pwa` with a maintained alternative before the next Next.js major upgrade.
6. Replace `xlsx` with a maintained alternative or pin to a specific audited version.

**Medium — Data Integrity:**
7. Resolve the dual `colegio`/`school_id` fields on `players` — migrate to `school_id` only and derive the display name via join.
8. Add a double-confirmation step for `execute_annual_progression` (irreversible operation).
9. Add a confirmation step and error display to `mergeSchools`.

**Medium — Code Quality:**
10. Generate Supabase TypeScript types using `supabase gen types typescript` and replace all `(r: any)` casts in `src/lib/queries/`.
11. Extract and unify the duplicated `formatDate` function into `src/lib/utils/dates.ts`.
12. Decompose `SchoolsMatrixView.tsx` (674 lines) and `SabadoSetupGrid.tsx` (582 lines).

**Low — Performance:**
13. Move admin KPI and trend aggregations to PostgreSQL RPC functions to avoid pulling raw records to application memory.
14. Add a year-range filter to the Excel export route.
15. Add client-side photo size/dimension validation before upload in `PlayerForm`.

---

*Concerns audit: 2026-04-11*
