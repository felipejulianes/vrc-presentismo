# System Architecture

**Analysis Date:** 2026-04-11

## Overview

VRC Presentismo is a mobile-first PWA for Virreyes Rugby Club coaches to record player attendance at training sessions. It is a full-stack Next.js 14 application backed exclusively by Supabase (PostgreSQL + Auth + Storage). The system is deployed on Vercel with no separate backend — all server-side logic lives in Next.js Server Components, Server Actions, and API Routes.

## Architecture Pattern

**Layered monolith with Next.js App Router.**

Three distinct rendering layers:
1. **Server Components** (default) — fetch data from Supabase directly with server-side RLS enforcement
2. **Server Actions / API Routes** — handle mutations; actions use `'use server'` directive
3. **Client Components** — interactive UI with `'use client'`; call API routes for mutations, never query Supabase directly except via the browser client for real-time or interactive reads

No Redux, no Zustand, no global client-side state store. React `useState` + custom hooks are the only client state mechanisms.

## Data Flow

### Read (Server Component path)

```
Browser Request
  → Next.js Middleware (src/middleware.ts) — validates Supabase session via cookie
    → Route Handler (Server Component page.tsx)
      → Query function in src/lib/queries/*.ts
        → createClient() from src/lib/supabase/server.ts (cookie-based)
          → Supabase PostgreSQL (RLS policies applied automatically)
            → Data returned as typed objects
              → Rendered as RSC HTML
```

### Write — Server Action path (most mutations)

```
Client form submit / button click
  → Server Action (actions.ts co-located with route, 'use server')
    → assertAdmin() or assertTutoraOrAdmin() guard (inline role check)
      → createAdminClient() or createClient()
        → Supabase upsert/insert/delete
          → revalidatePath() — clears Next.js cache for affected route
            → Client sees updated data on next render
```

### Write — API Route path (attendance)

```
Client Component (AttendanceGrid.tsx) — useAttendance hook
  → fetch('/api/attendance', { method: 'POST' })
    → src/app/api/attendance/route.ts
      → Auth check (supabase.auth.getUser())
      → Role check (profiles table)
      → coach_divisions check (if role === 'coach')
        → Upsert training_session
        → Upsert attendance_records
          → JSON response { success, sessionId }
```

### Auth flow

```
/login → signInWithPassword → Supabase Auth → session cookie set by middleware
/auth/callback → handles OAuth code exchange + password reset token_hash
Middleware (src/middleware.ts) → runs on every non-static request → redirects to /login if no session
(app)/layout.tsx → secondary access guard → shows pending screen if coach has no divisions
```

## Key Components

### Supabase Clients (src/lib/supabase/)

Three clients, each with a distinct scope:
- `server.ts` — `createServerClient` using Next.js `cookies()`. For Server Components and Server Actions. Respects RLS with the authenticated user's JWT.
- `client.ts` — `createBrowserClient` for Client Components. Same anon key, session managed via cookie. Used only for interactive features (currently minimal use).
- `admin.ts` — `createClient` with `SUPABASE_SERVICE_ROLE_KEY`. Bypasses RLS. Exclusively for server-side admin operations (create/delete users, division assignments, annual progression). Never exposed to the browser.

### Query Layer (src/lib/queries/)

Pure async functions that wrap Supabase queries. Always called from Server Components or Server Actions — never from Client Components.

- `players.ts` — `getPlayersByDivision`, `getPlayersForUser`, `getPlayerById`, `getDivisionsForUser`. Handles role-based filtering: admin/tutora sees all; coach sees only assigned divisions.
- `attendance.ts` — `getSessionsForDivision`, `getSessionWithAttendance`, `getSessionById`. Returns typed summary objects.
- `stats.ts` — Wraps Supabase RPC calls for aggregated statistics. Also contains client-side aggregation functions for trend charts.
- `docs.ts` — Queries for `player_documents` table.

### Server Actions (co-located actions.ts files)

Each feature area has its own `actions.ts` with `'use server'` at the top:
- `src/app/(auth)/login/actions.ts` — `login`, `logout`, `sendPasswordReset`
- `src/app/(app)/admin/actions.ts` — `createCoach`, `createTutora`, `updateCoachDivisions`, `updateUserRole`, `deleteCoach`, `executeProgression`. All guarded by `assertAdmin()`.
- `src/app/(app)/docs/actions.ts` — Document receipt management
- `src/app/(app)/players/[playerId]/actions.ts` — Player notes and follow-up contacts

### API Routes (src/app/api/)

- `src/app/api/attendance/route.ts` — POST endpoint for saving attendance. Called from the `useAttendance` client hook. Includes role and division authorization checks.
- `src/app/api/attendance/[divisionId]/export/route.ts` — Export endpoint for attendance data.
- `src/app/api/geocode/route.ts` — Geocoding proxy for address lookup.

### Client Components (src/components/)

Organized by feature domain: `admin/`, `attendance/`, `clubs/`, `docs/`, `layout/`, `players/`, `settings/`, `stats/`, `tutoras/`, `ui/`, `wiki/`. Pure presentation + local interaction. Mutations go through fetch to API routes or are submitted via forms to Server Actions.

### Custom Hook (src/lib/hooks/useAttendance.ts)

Single hook managing attendance toggle state and POST submission to `/api/attendance`. Returns `{ attendance, toggle, save, saving, saved, error, presentCount }`.

## Auth & Security

### Authentication

Supabase Auth with email/password. OAuth callback handled at `src/app/auth/callback/route.ts` (PKCE code exchange + token_hash for email recovery). Password reset uses Supabase email with a `token_hash` link.

### Authorization — Two layers

**Layer 1 — Middleware** (`src/middleware.ts`): Runs on every non-static request. Validates Supabase session cookie. Unauthenticated users → redirect to `/login`. Authenticated users on public routes → redirect to `/attendance`.

**Layer 2 — App layout guard** (`src/app/(app)/layout.tsx`): After auth check, verifies role-based access. Roles `admin` and `tutora` pass through unconditionally. Role `coach` must have at least one entry in `coach_divisions` or a pending-activation screen is shown.

**Layer 3 — Data layer RLS**: Supabase Row Level Security policies enforce access at the database level. Helper functions `get_user_role()` and `coach_has_division(div_id)` are used within RLS policies. Server Actions perform explicit role assertions (`assertAdmin()`, `assertTutoraOrAdmin()`) as a defense-in-depth measure before using the admin client.

### Roles

| Role | Access | Nav |
|------|--------|-----|
| `coach` | Assigned divisions only | 4-tab bottom nav |
| `admin` | Everything | 5-tab bottom nav (adds Coordinación) |
| `tutora` | Tutora section + player data | Dedicated tutoras bottom nav |

### Secrets

`SUPABASE_SERVICE_ROLE_KEY` is server-only (no `NEXT_PUBLIC_` prefix). The admin client is never instantiated outside server-side code paths. The anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) is safe to expose — all access is controlled by RLS.

## State Management

**Server state**: Managed entirely by Supabase + Next.js cache. `revalidatePath()` is called after every mutation to invalidate cached pages.

**Client state**: React `useState` only, scoped to individual components or the `useAttendance` hook. No global client store.

**Attendance state**: `Record<playerId, boolean>` local to the attendance taking session. Persisted to DB on explicit save. No optimistic updates — save is synchronous with feedback states (`saving`, `saved`, `error`).

## Database

PostgreSQL via Supabase. 32 migrations in `supabase/migrations/` (001-032).

Key tables:
- `divisions` — Rugby age divisions with sort order
- `profiles` — Linked to `auth.users`; holds `role` and `full_name`
- `coach_divisions` — Many-to-many: coaches to divisions
- `players` — Core player records with `active`/`inactivo` soft delete
- `training_sessions` — One per (division, date); UNIQUE constraint
- `attendance_records` — One per (session, player); stores `present` bool
- `player_documents` — DNI/apto/ficha receipt tracking
- `player_notes` — Coach notes journal; travels with player across divisions
- `player_followups` — Contact log for absent players

RPC functions handle aggregated stats (`get_attendance_stats_*`) and annual category progression (`preview_annual_progression`, `execute_annual_progression`).

---

*Architecture analysis: 2026-04-11*
