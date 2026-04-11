# Codebase Structure

**Analysis Date:** 2026-04-11

## Directory Tree

```
project-root/
├── public/                    # Static assets
│   ├── help/                  # Help section images/content
│   ├── icons/                 # PWA icons (icon-192.png, icon-512.png)
│   ├── logo.png               # Full logo with text (login screen)
│   ├── isotipo.png            # Ball+stripes logo (app header)
│   ├── foto-infantiles.jpg    # Team photo (login background)
│   └── manifest.json          # PWA manifest
├── scripts/                   # One-off utility scripts
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── layout.tsx         # Root layout: HTML shell, Inter font, PWA metadata
│   │   ├── globals.css        # Global Tailwind styles
│   │   ├── (app)/             # Authenticated route group
│   │   │   ├── layout.tsx     # App shell: header + BottomNav + access guard
│   │   │   ├── admin/         # Admin-only area
│   │   │   │   ├── page.tsx                  # Admin dashboard
│   │   │   │   ├── actions.ts                # Coach CRUD, progression, role mgmt
│   │   │   │   ├── hoy/                      # Cross-division daily attendance view
│   │   │   │   ├── coaches/                  # Coach list, create, edit
│   │   │   │   ├── progression/              # Annual category advancement
│   │   │   │   ├── sabados/                  # Saturday fixtures management
│   │   │   │   ├── buses/                    # Bus logistics
│   │   │   │   ├── clubs/                    # Opponent clubs management
│   │   │   │   ├── schools/                  # Schools management
│   │   │   │   └── tercer-tiempo/            # Post-match third-half management
│   │   │   ├── attendance/    # Attendance taking
│   │   │   │   ├── page.tsx                  # Division selector (or redirect)
│   │   │   │   └── [divisionId]/
│   │   │   │       ├── page.tsx              # Session history for division
│   │   │   │       ├── new/page.tsx          # Take attendance grid
│   │   │   │       ├── [sessionId]/page.tsx  # View/edit existing session
│   │   │   │       └── tabla/page.tsx        # Attendance table view
│   │   │   ├── players/       # Player management
│   │   │   │   ├── page.tsx                  # Player list grouped by division
│   │   │   │   ├── new/page.tsx              # Create player
│   │   │   │   └── [playerId]/
│   │   │   │       ├── page.tsx              # Player detail: photo, stats, contact
│   │   │   │       ├── edit/page.tsx         # Edit player
│   │   │   │       └── actions.ts            # Notes and followup server actions
│   │   │   ├── stats/         # Attendance statistics
│   │   │   │   ├── page.tsx                  # Division selector
│   │   │   │   └── [divisionId]/page.tsx     # Stats: year/60d/since-alta/trend
│   │   │   ├── docs/          # Player documentation (DNI/apto/ficha)
│   │   │   │   ├── page.tsx
│   │   │   │   └── actions.ts
│   │   │   ├── tutoras/       # Tutora role section
│   │   │   │   ├── page.tsx                  # Tutora dashboard
│   │   │   │   ├── docs/page.tsx             # Documents view for tutoras
│   │   │   │   ├── interviews/page.tsx       # Player interviews
│   │   │   │   ├── players/page.tsx          # Player list for tutoras
│   │   │   │   └── schools/
│   │   │   │       ├── page.tsx              # School list
│   │   │   │       └── [schoolId]/page.tsx   # School detail
│   │   │   ├── clubs/page.tsx                # Rugby clubs directory
│   │   │   ├── wiki/page.tsx                 # Internal wiki/reglamento
│   │   │   ├── ayuda/page.tsx                # Help guide for coaches
│   │   │   ├── more/page.tsx                 # "Más" overflow menu
│   │   │   └── settings/page.tsx             # User settings (change password)
│   │   ├── (auth)/            # Unauthenticated route group
│   │   │   └── login/
│   │   │       ├── page.tsx                  # Login form (email/password + reset)
│   │   │       └── actions.ts                # login, logout, sendPasswordReset
│   │   ├── auth/              # Auth callback routes (outside route groups)
│   │   │   ├── callback/route.ts             # OAuth + email token exchange
│   │   │   └── reset-password/page.tsx       # Password reset form
│   │   └── api/               # REST API routes
│   │       ├── attendance/
│   │       │   ├── route.ts                  # POST: upsert attendance
│   │       │   └── [divisionId]/export/      # GET: export attendance data
│   │       └── geocode/route.ts              # Address geocoding proxy
│   ├── components/            # Reusable UI components
│   │   ├── admin/             # Admin-specific components
│   │   ├── attendance/        # AttendanceGrid, PlayerCard, MapsLink
│   │   ├── clubs/             # ClubsView
│   │   ├── docs/              # DocsView
│   │   ├── layout/            # BottomNav (role-aware navigation)
│   │   ├── players/           # PlayerForm, PlayerList, CameraCapture,
│   │   │                      #   FollowupLog, PlayerNotes, PlayerInterviews,
│   │   │                      #   SchoolCombobox
│   │   ├── settings/          # ChangePasswordForm
│   │   ├── stats/             # StatsView, AdminStatsView, AbsenteeCard
│   │   ├── tutoras/           # Tutora-specific views and tables
│   │   ├── ui/                # Shared primitives (AddressInput)
│   │   └── wiki/              # WikiPageList
│   ├── lib/                   # Shared logic and utilities
│   │   ├── supabase/
│   │   │   ├── server.ts      # createClient() — Server Components/Actions
│   │   │   ├── client.ts      # createClient() — Client Components
│   │   │   └── admin.ts       # createAdminClient() — service_role (bypasses RLS)
│   │   ├── queries/           # Data access functions (server-only)
│   │   │   ├── players.ts     # Player + division queries
│   │   │   ├── attendance.ts  # Session + attendance record queries
│   │   │   ├── stats.ts       # RPC-based statistics + admin trend data
│   │   │   └── docs.ts        # Player document queries
│   │   ├── hooks/
│   │   │   └── useAttendance.ts  # Client hook: toggle state + POST to API
│   │   ├── docs/
│   │   │   └── constants.ts   # DocType, DOC_LABELS — no Supabase imports (safe for client)
│   │   └── utils/
│   │       ├── whatsapp.ts    # formatWhatsAppNumber, buildWhatsAppUrl
│   │       └── dates.ts       # daysAgoISO and other date helpers
│   └── types/
│       └── index.ts           # Shared TypeScript types: Division, Player,
│                              #   TrainingSession, AttendanceRecord, Profile,
│                              #   AttendanceState, PlayerInterview, SchoolVisit
└── supabase/
    └── migrations/            # 32 sequential SQL migration files (001–032)
```

## Key Files

### Entry Points

- `src/app/layout.tsx` — Root HTML shell. Sets PWA metadata, Inter font, theme color.
- `src/app/(app)/layout.tsx` — Authenticated app shell. Fetches user profile, renders header + `BottomNav`, enforces access guard (pending activation screen for coaches without divisions).
- `src/middleware.ts` — Edge middleware. Session validation on every request. Redirects unauthenticated users to `/login`.

### Supabase Clients

- `src/lib/supabase/server.ts` — Import as `createClient` in Server Components and Server Actions. Cookie-based, respects user JWT and RLS.
- `src/lib/supabase/client.ts` — Import as `createClient` in Client Components. Browser-based, same anon key.
- `src/lib/supabase/admin.ts` — Import as `createAdminClient` only in server-side code. Uses `SUPABASE_SERVICE_ROLE_KEY`, bypasses RLS entirely.

### Query Functions

- `src/lib/queries/players.ts` — `getPlayersForUser` (role-filtered), `getPlayersByDivision`, `getPlayerById`, `getDivisionsForUser`
- `src/lib/queries/attendance.ts` — `getSessionsForDivision`, `getSessionWithAttendance`, `getSessionById`
- `src/lib/queries/stats.ts` — `getStatsByDays`, `getStatsBySessions`, `getStatsByYear`, `getStatsSinceAlta`, `getSessionTrend`, `getDivisionKpis`, `getAdminDivisionStats`, `getAdminKpis`, `getAdminTrendData`
- `src/lib/queries/docs.ts` — Player document receipt queries

### Server Actions

- `src/app/(auth)/login/actions.ts` — Authentication actions
- `src/app/(app)/admin/actions.ts` — User and coach management; annual progression
- `src/app/(app)/docs/actions.ts` — Document management
- `src/app/(app)/players/[playerId]/actions.ts` — Player notes and follow-up contacts

### API Routes

- `src/app/api/attendance/route.ts` — POST handler for saving attendance; includes role and division authorization
- `src/app/api/attendance/[divisionId]/export/route.ts` — Attendance export
- `src/app/api/geocode/route.ts` — Geocoding proxy

### Types

- `src/types/index.ts` — All shared types. Import from `@/types`.
- `src/lib/docs/constants.ts` — Document-specific types/constants kept separate to avoid Supabase server imports in Client Components.

### Key Components

- `src/components/layout/BottomNav.tsx` — Role-aware bottom navigation. Renders different tab sets for `coach`, `admin`, and `tutora` roles, and for the `/tutoras/*` subroute.
- `srctml/components/attendance/AttendanceGrid.tsx` — Interactive player grid. Uses `useAttendance` hook, calls `/api/attendance`.
- `src/components/players/CameraCapture.tsx` — Camera access for player photos.
- `src/components/players/FollowupLog.tsx` — Absent player contact log (client component).
- `src/components/players/PlayerNotes.tsx` — Coach notes journal (client component).

### Migrations

- `supabase/migrations/001_schema.sql` through `032_auto_create_profile.sql` — Applied manually in Supabase SQL Editor in order. Cover schema creation, RLS policies, seed data, feature additions, and function definitions.

## Module Organization

**Feature co-location**: Each route directory contains its own `page.tsx` and `actions.ts`. Business logic for a feature lives with that feature's route, not in a shared services layer.

**Shared infrastructure in `src/lib/`**: Query functions (data access), Supabase clients, hooks, utilities, and constants live here and are imported by feature code.

**Components by domain**: `src/components/` is organized by feature domain, not by component type. Each subdirectory contains all components needed for that domain (views, forms, cards, grids).

**Types centralized**: All TypeScript types in `src/types/index.ts`. Exception: constants needing to be safely imported by both Server and Client Components go in dedicated files under `src/lib/` without Supabase imports (e.g., `src/lib/docs/constants.ts`).

## Naming Conventions

**Files:**
- Page files: `page.tsx` (enforced by Next.js App Router)
- Server action files: `actions.ts` (co-located with route)
- API route files: `route.ts` (enforced by Next.js)
- Component files: `PascalCase.tsx` (e.g., `AttendanceGrid.tsx`, `BottomNav.tsx`)
- Library files: `camelCase.ts` (e.g., `useAttendance.ts`, `whatsapp.ts`)
- Type files: `camelCase.ts` (e.g., `index.ts` under `src/types/`)

**Directories:**
- Route segments: `kebab-case` (e.g., `[divisionId]`, `tercer-tiempo`, `reset-password`)
- Component subdirectories: `camelCase` domain name (e.g., `players/`, `attendance/`, `tutoras/`)
- Dynamic segments: `[paramName]` (camelCase param name)

**Exports:**
- Named exports only — no default exports in lib files or components (exception: Next.js page/layout default exports which are required by the framework)

## Entry Points and Bootstrapping

1. `src/app/layout.tsx` — Root. Sets `<html lang="es">`, global font, PWA metadata.
2. `src/middleware.ts` — Runs before every page. Session refresh and auth redirect.
3. `src/app/(app)/layout.tsx` — Authenticated shell. Profile fetch, role check, layout render.
4. Feature `page.tsx` — Server Component. Fetches data via `src/lib/queries/*`, renders page.

## Where to Add New Code

**New authenticated page:**
- Create `src/app/(app)/[feature]/page.tsx`
- Add query function to `src/lib/queries/[feature].ts` or extend existing file
- Add mutations to `src/app/(app)/[feature]/actions.ts`
- Add components to `src/components/[feature]/`

**New admin-only page:**
- Create under `src/app/(app)/admin/[feature]/page.tsx`
- Guard actions with `assertAdmin()` from `src/app/(app)/admin/actions.ts`

**New shared type:**
- Add to `src/types/index.ts`
- If the type must be imported by Client Components without triggering Supabase server imports, create a separate file under `src/lib/` (pattern: `src/lib/[domain]/constants.ts`)

**New utility function:**
- Add to `src/lib/utils/[name].ts`

**New API route (interactive mutation):**
- Create `src/app/api/[feature]/route.ts`
- Always validate session with `supabase.auth.getUser()` first
- Check role from `profiles` table before acting

**Database changes:**
- Create a new migration file: `supabase/migrations/033_[description].sql`
- Apply manually in Supabase SQL Editor (no automated migration runner)

---

*Structure analysis: 2026-04-11*
