# Testing

**Analysis Date:** 2026-04-11

## Test Framework

**No automated test suite exists in this codebase.**

- No Jest, Vitest, or other unit/integration test runner is configured
- No test configuration files found (`jest.config.*`, `vitest.config.*` — all absent)
- `playwright` is listed as a devDependency in `package.json` but no Playwright config file (`playwright.config.*`) exists at the project root
- The `scripts/` directory contains utility scripts (`import_players_from_excel.py`, `reset-test-data.mjs`, `take-screenshots.js`) — none are automated test runners

**Run Commands:**
```bash
npm run build    # Only quality gate: TypeScript compilation + Next.js build
npm run lint     # ESLint (next/core-web-vitals + next/typescript rules)
```

There are no `npm test` or equivalent commands defined in `package.json`.

## Test Organization

No test files exist in the codebase. There are no `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx` files anywhere under `src/`.

## Test Types

### What Exists

**Manual testing only.** The development workflow (described in `CLAUDE.md`) is:
1. Make code changes
2. Run `npm run build` to verify TypeScript compiles
3. Push to `main`, Vercel deploys automatically in ~2 minutes
4. Verify in the live deployment

**Script-based utilities (not automated tests):**
- `scripts/reset-test-data.mjs` — manually resets data in the database for testing scenarios
- `scripts/take-screenshots.js` — Playwright-based screenshot capture (smoke test / documentation purpose, not assertion-based)
- `scripts/import_players_from_excel.py`, `scripts/import_attendance_from_excel.py`, `scripts/import_prerugby_combined.py` — data import utilities

### What Does NOT Exist
- Unit tests for utility functions (`src/lib/utils/dates.ts`, `src/lib/utils/whatsapp.ts`)
- Integration tests for query functions (`src/lib/queries/`)
- Component tests for UI components
- API route tests (`src/app/api/attendance/route.ts`, `src/app/api/geocode/route.ts`)
- End-to-end tests with assertion-based flows
- Server action tests

## Coverage

**Formal coverage: 0% (no test runner configured)**

**Areas with zero test coverage:**
- `src/lib/utils/whatsapp.ts` — `formatWhatsAppNumber()` has clear edge cases (Argentine phone number normalization) with no tests
- `src/lib/utils/dates.ts` — date formatting helpers with locale-specific behavior, no tests
- `src/lib/hooks/useAttendance.ts` — custom hook with async save logic, no tests
- `src/lib/queries/` — all Supabase query functions (8 modules), no tests
- `src/app/api/attendance/route.ts` — critical upsert endpoint for attendance data, no tests
- `src/app/(app)/admin/actions.ts` — admin Server Actions including `executeProgression()` (irreversible), no tests
- All React components

**Highest-risk untested code:**
- `src/app/(app)/admin/actions.ts` → `executeProgression()` calls `execute_annual_progression()` RPC which is documented as **irreversible**
- `src/app/api/attendance/route.ts` → core business logic for saving attendance records
- `src/lib/utils/whatsapp.ts` → phone number normalization has many edge cases (leading 0, leading 15, country code 54)

## Running Tests

No test commands are available. The only quality gates are:

```bash
npm run build    # TypeScript type checking + Next.js build validation
npm run lint     # ESLint rule checking
```

## Recommendations for Adding Tests

If tests are added, the following setup would match the stack:

**Unit tests** (utility functions):
- Vitest is recommended for Next.js 14 projects (Jest requires additional config for ESM)
- Test targets: `src/lib/utils/whatsapp.ts`, `src/lib/utils/dates.ts`

**Integration tests** (API routes):
- Next.js `@next/test-utils` or MSW (Mock Service Worker) for Supabase mocking
- Test target: `src/app/api/attendance/route.ts`

**E2E tests** (Playwright already installed):
- Add `playwright.config.ts` at project root
- `take-screenshots.js` could be converted to assertion-based Playwright tests

---

*Testing analysis: 2026-04-11*
