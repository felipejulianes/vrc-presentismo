# External Integrations

**Analysis Date:** 2026-04-11

## Authentication

**Provider:** Supabase Auth (built-in)

- Session management via HTTP-only cookies using `@supabase/ssr`
- Server-side session: `createServerClient` from `@supabase/ssr` in `src/lib/supabase/server.ts`
- Client-side session: `createBrowserClient` from `@supabase/ssr` in `src/lib/supabase/client.ts`
- Auth guard enforced in `src/middleware.ts` — unauthenticated requests redirect to `/login`
- Public paths: `/login/*` and `/auth/*` (OAuth/reset callbacks)
- Google OAuth supported (auto-creates profile on first login via DB trigger — see migration `032_auto_create_profile.sql`)
- Password reset flow handled at `/auth/` callback route

**Roles managed in DB:**
- `profiles.role` field: `'admin'` | `'coach'` | `'tutora'`
- Role enforcement via Supabase RLS helper functions (`get_user_role()`, `coach_has_division()`)

## Database

**Provider:** Supabase (PostgreSQL)

**Connection clients:**

| Client | File | Auth key | Usage |
|--------|------|---------|-------|
| `createClient()` | `src/lib/supabase/server.ts` | anon key | Server Components, API routes (respects RLS) |
| `createClient()` | `src/lib/supabase/client.ts` | anon key | Client Components (respects RLS) |
| `createAdminClient()` | `src/lib/supabase/admin.ts` | service_role key | Server Actions requiring RLS bypass (admin ops) |

**Schema management:** SQL migration files in `supabase/migrations/` (001–032), run manually in Supabase SQL Editor.

**RPC functions called from the app:**

| Function | Called from | Purpose |
|----------|------------|---------|
| `get_attendance_stats_year(division_id, year)` | `src/lib/queries/stats.ts` | Year stats |
| `get_attendance_stats_days(division_id, days)` | `src/lib/queries/stats.ts` | Last N days stats |
| `get_attendance_stats_sessions(division_id, sessions)` | `src/lib/queries/stats.ts` | Last N sessions stats |
| `get_attendance_stats_since_alta(division_id)` | `src/lib/queries/stats.ts` | Since player registration stats |
| `preview_annual_progression()` | `src/app/(app)/admin/actions.ts` | Preview category advance |
| `execute_annual_progression()` | `src/app/(app)/admin/actions.ts` | Execute annual progression (irreversible) |

**Key query files:**
- `src/lib/queries/players.ts` — Player CRUD with RLS
- `src/lib/queries/attendance.ts` — Session and attendance record queries
- `src/lib/queries/stats.ts` — Stats via RPC
- `src/lib/queries/docs.ts` — Player document queries

## File Storage

**Provider:** Supabase Storage

- Player photos stored in Supabase Storage buckets (configured in migration `005_storage.sql`)
- Remote image domain whitelisted in `next.config.mjs`: `*.supabase.co/storage/v1/object/public/**`
- Photos served via Next.js `<Image>` component with Supabase CDN URLs
- PWA Service Worker caches Supabase Storage URLs (`CacheFirst`, max 500 entries, 7-day TTL)

## External APIs

**Nominatim (OpenStreetMap Geocoding):**
- Endpoint: `https://nominatim.openstreetmap.org/search`
- Called via internal proxy route: `src/app/api/geocode/route.ts`
- Restricted to Argentina (`countrycodes=ar`)
- Response cached by Next.js for 1 hour (`next: { revalidate: 3600 }`)
- No API key required (free, rate-limited service)
- User-Agent: `VRC-Presentismo/1.0 (virreyes-rugby-club)`

**WhatsApp (wa.me deep links):**
- No SDK — simple URL construction
- Helper: `src/lib/utils/whatsapp.ts` — `formatWhatsAppNumber()` and `buildWhatsAppUrl()`
- Format: `https://wa.me/549{digits}` (Argentine mobile format)
- Links open WhatsApp natively on mobile; no backend call

## Deployment & Hosting

**Frontend:** Vercel
- Auto-deploys on push to `main` branch
- Production URL: `https://vrc-presentismo.vercel.app`

**Backend:** Supabase Cloud
- PostgreSQL database
- Auth service
- Storage service

## Environment Variables

| Variable | Visibility | Purpose |
|----------|-----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (browser) | Supabase project endpoint |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (browser) | Supabase anon/public key (RLS enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | Service role key (bypasses RLS — admin operations only) |

Example file: `.env.local.example`

**Security note:** `SUPABASE_SERVICE_ROLE_KEY` must never be prefixed with `NEXT_PUBLIC_` — it is only used in `src/lib/supabase/admin.ts` which is imported exclusively from Server Actions and API routes.

## Webhooks / Events

**Inbound webhooks:** None detected.

**Outbound events:** None detected (no webhook dispatch code found).

**Supabase Realtime:** Not used — all data fetching is request/response (no subscriptions).

**PWA Service Worker:** Handles offline caching for Supabase REST and Storage URLs. Defined in `next.config.mjs` runtime caching config.

---

*Integration audit: 2026-04-11*
