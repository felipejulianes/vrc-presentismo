# Technology Stack

**Analysis Date:** 2026-04-11

## Core Technologies

**Languages:**
- TypeScript 5.x - All application code (strict mode enabled)
- SQL - Supabase/PostgreSQL migrations in `supabase/migrations/`
- Python - Utility import scripts in `scripts/` (not part of the app runtime)

**Runtime:**
- Node.js 24.x (detected on dev machine; no `.nvmrc` present)

**Package Manager:**
- npm (lockfile: `package-lock.json` present)

## Frameworks

**Primary:**
- Next.js 14.2.35 - App Router, Server Components, Server Actions, API Routes
- React 18.x - UI rendering

**PWA:**
- next-pwa 5.6.0 - Service Worker generation, runtime caching strategy
  - Config: `next.config.mjs`
  - Disabled in `development` mode (`NODE_ENV === 'development'`)
  - Service Worker runtime caching targets: Supabase Storage (CacheFirst, 7d) and Supabase REST (NetworkFirst, 1h)
  - PWA manifest: `public/manifest.json`
  - Display mode: `standalone` (installable as native-like app)

**Styling:**
- Tailwind CSS 3.4.1 - Utility-first CSS
  - Config: `tailwind.config.ts`
  - Custom brand colors: `vrc-green` (#2b7a2b), `vrc-orange` (#e07020), `vrc-gold` (#f5c020)
- PostCSS 8.x - CSS processing (`postcss.config.mjs`)

## Build System

**Bundler/Compiler:** Next.js built-in (SWC)

**TypeScript config:** `tsconfig.json`
- Strict mode: `true`
- Module resolution: `bundler`
- Path alias: `@/*` → `./src/*`

**Build commands:**
```bash
npm run dev      # Development server (next dev)
npm run build    # Production build (next build)
npm run start    # Production server (next start)
npm run lint     # ESLint (next lint)
```

## Key Dependencies

| Package | Version | Role |
|---------|---------|------|
| `next` | 14.2.35 | Full-stack React framework (App Router) |
| `react` / `react-dom` | ^18 | UI library |
| `@supabase/supabase-js` | ^2.99.3 | Supabase JS client (DB, Auth, Storage) |
| `@supabase/ssr` | ^0.9.0 | Supabase SSR helpers for Next.js (cookie-based sessions) |
| `next-pwa` | ^5.6.0 | PWA/Service Worker support |
| `recharts` | ^3.8.1 | Attendance statistics charts |
| `react-markdown` | ^10.1.0 | Markdown rendering (wiki/docs sections) |
| `remark-gfm` | ^4.0.1 | GitHub Flavored Markdown plugin for react-markdown |
| `xlsx` | ^0.18.5 | Excel file parsing (likely for data import utilities) |

## Dev Tooling

| Tool | Version | Purpose |
|------|---------|---------|
| `eslint` | ^8 | Linting |
| `eslint-config-next` | 14.2.35 | Next.js ESLint rules |
| `typescript` | ^5 | Type checking |
| `@types/node` | ^20 | Node type definitions |
| `@types/react` / `@types/react-dom` | ^18 | React type definitions |
| `playwright` | ^1.59.1 | End-to-end testing (screenshots script in `scripts/take-screenshots.js`) |
| `tailwindcss` | ^3.4.1 | Utility CSS framework |
| `postcss` | ^8 | CSS transformer |

No testing framework (Jest/Vitest) is configured. Playwright is present but used for screenshot generation rather than a full test suite.

## Environment Requirements

**Node.js:** 18+ required by Next.js 14 (24.x detected on dev machine)

**Required environment variables:**
```
NEXT_PUBLIC_SUPABASE_URL       # Supabase project URL (exposed to browser)
NEXT_PUBLIC_SUPABASE_ANON_KEY  # Supabase anon/public key (exposed to browser)
SUPABASE_SERVICE_ROLE_KEY      # Service role key (server-only, bypasses RLS)
```

**Environment file:** `.env.local` (example at `.env.local.example`)

## Platform

**Frontend deployment:** Vercel (auto-deploy from `main` branch on push)
**Backend/Database:** Supabase Cloud (PostgreSQL + Auth + Storage)
**No Docker** configuration detected.

---

*Stack analysis: 2026-04-11*
