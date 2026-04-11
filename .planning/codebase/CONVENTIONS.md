# Coding Conventions

**Analysis Date:** 2026-04-11

## Code Style

**Formatting:**
- No Prettier config detected — formatting is not enforced by a tool
- Indentation: 2 spaces (consistent across all source files)
- Trailing semicolons: omitted (no semicolons at end of statements)
- Single quotes for strings
- Arrow functions used for callbacks; named `function` declarations for top-level and component helpers

**Linting:**
- ESLint via `.eslintrc.json`, extends `next/core-web-vitals` and `next/typescript`
- `@typescript-eslint/no-explicit-any` is enabled — suppressed inline with `// eslint-disable-next-line @typescript-eslint/no-explicit-any` when Supabase join types are unavoidable
- `@typescript-eslint/no-unused-vars` is active — suppressed inline where needed (e.g., `_playerName` param in `whatsapp.ts`)
- No custom rule overrides; relies entirely on Next.js preset

## Naming Conventions

**Files:**
- React component files: PascalCase, `.tsx` extension — `AttendanceGrid.tsx`, `PlayerNotes.tsx`, `BottomNav.tsx`
- Non-component TypeScript files: camelCase, `.ts` extension — `useAttendance.ts`, `whatsapp.ts`, `dates.ts`
- Page and layout files: lowercase Next.js convention — `page.tsx`, `layout.tsx`, `actions.ts`, `route.ts`
- Constant files: camelCase — `constants.ts`

**Directories:**
- Feature grouping under `src/components/`: kebab-case by domain — `admin/`, `attendance/`, `players/`, `layout/`, `ui/`
- Route groups under `src/app/`: Next.js conventions — `(app)/`, `(auth)/`, `api/`, `auth/`
- Library utilities: `src/lib/` with subdirectories `queries/`, `hooks/`, `supabase/`, `utils/`, `docs/`

**Variables and Functions:**
- Variables: camelCase — `divisionId`, `sessionDate`, `attendanceState`, `isPending`
- Functions: camelCase verbs — `getPlayersByDivision()`, `formatWhatsAppNumber()`, `buildActivityInfo()`
- Boolean variables: no `is` prefix required but used for React state — `isPending`, `saving`, `saved`
- Constants (module-level): SCREAMING_SNAKE_CASE — `PLAYER_FIELDS`, `FULL_ACCESS_ROLES`, `DOC_LABELS`, `ALL_DOC_TYPES`, `DIVISION_COLORS`

**Components:**
- PascalCase function names — `export function PlayerNotes(...)`, `export function AttendanceGrid(...)`
- Props interface named `Props` for simple components, or descriptive name `AttendanceGridProps` for complex ones
- Internal helper components defined in the same file as the page that uses them (e.g., `SessionCard` in `attendance/[divisionId]/page.tsx`, `AttendanceBar` in `players/[playerId]/page.tsx`)

**Types:**
- Domain types: PascalCase in `src/types/index.ts` — `Player`, `Division`, `TrainingSession`, `AttendanceRecord`, `Profile`
- Local component types: defined inline at top of file — `PlayerNote`, `NavItem`, `ActivityInfo`
- Generic objects: `Record<string, T>` preferred over index signatures

## TypeScript Patterns

**Strictness:**
- `"strict": true` in `tsconfig.json` — full strict mode enabled
- `noEmit: true` — TypeScript used for type checking only, not compilation

**Type imports:**
- Prefer `import type` for type-only imports — `import type { Player, Division } from '@/types'`
- Mixed imports where both values and types are needed — `import { createClient } from '@/lib/supabase/server'`

**Type assertions:**
- Avoid `as unknown as T` — instead use explicit intermediate types
- Use `as string` for FormData `.get()` calls consistently: `formData.get('field') as string`
- Non-null assertion `!` used for env vars — `process.env.NEXT_PUBLIC_SUPABASE_URL!`

**Nullability:**
- Optional chaining `?.` used extensively for nested property access
- Nullish coalescing `??` preferred over `||` for default values
- Functions return `null` for "not found" cases (`getPlayerById` returns `Player | null`)
- Functions return `[]` for empty collections on error (query functions in `stats.ts`)

**`any` usage:**
- Avoided in types and interfaces; permitted only at Supabase join boundaries
- Always suppressed with inline eslint-disable comment when used
- Pattern: `(data ?? []).map((p: any) => ({ ...p, ... }))`

**Interfaces vs Types:**
- `type` keyword preferred for object shapes — `type PlayerFormProps`, `type ActivityInfo`
- `interface` used when explicitly needed: `interface Props`, `interface AttendanceGridProps`, `interface UseAttendanceOptions`

## Component Patterns

**Server vs Client split:**
- Server Components (default): pages that only fetch data and render — `src/app/(app)/players/[playerId]/page.tsx`
- Client Components (explicit `'use client'` directive at top): any component using hooks, browser APIs, or event handlers
- `'use server'` directive at top of actions files — `src/app/(app)/players/[playerId]/actions.ts`

**Component structure (Client Components):**
```typescript
'use client'

import { useState, useTransition } from 'react'
import { serverAction } from '@/app/(app)/path/actions'
import { utility } from '@/lib/utils/module'

interface Props {
  propA: string
  propB: DataType[]
}

export function ComponentName({ propA, propB }: Props) {
  const [state, setState] = useState(...)
  const [isPending, startTransition] = useTransition()

  function handleEvent(...) {
    startTransition(async () => {
      const result = await serverAction(...)
      if (result?.error) { ... }
    })
  }

  return ( ... )
}
```

**Props pattern:**
- Props typed with inline `interface Props` or named `interface XxxProps`
- Destructured directly in function signature — `{ playerId, notes, currentUserId }: Props`
- Optional props use `?` — `showDatePicker?: boolean`, `backUrl?: string`

**State management:**
- Local `useState` for UI state — forms, modals, loading, errors
- `useTransition` wraps server action calls in Client Components
- Custom hooks extract complex stateful logic — `useAttendance` in `src/lib/hooks/useAttendance.ts`
- No global state manager (no Redux, Zustand, or Context used)

**Forms:**
- Controlled state forms using a single `form` object state (in `PlayerForm.tsx`)
- Uncontrolled forms using `FormData` for simpler cases (in `PlayerNotes.tsx`, Server Action pattern)
- Error displayed inline with `state.error` pattern returned from Server Actions: `{ error: string }` or `{ success: true }`

**UI patterns:**
- Tailwind CSS utility classes, no CSS modules or styled-components
- Mobile-first layout; sticky header (`top-0`) + sticky bottom nav (`bottom-0`)
- Bottom sheet modals implemented with `fixed inset-0 z-50 flex flex-col justify-end`
- Inline SVG icons (no icon library), defined as local functions in `BottomNav.tsx`
- Club colors via Tailwind custom tokens: `bg-vrc-green`, `text-vrc-orange`, `text-vrc-gold`

## Error Handling

**Server Actions pattern:**
```typescript
export async function actionName(id: string, formData: FormData) {
  const value = (formData.get('field') as string)?.trim()
  if (!value) return { error: 'Mensaje de validación' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.from('table').insert(...)
  if (error) return { error: error.message }

  revalidatePath('/path')
  return { success: true }
}
```

**Query functions pattern:**
- Throw on unexpected errors: `if (error) throw error`
- Return empty array on error for stats/list queries: `if (error) return []`
- Return `null` for single-item not found: `if (error) return null`

**API routes pattern:**
```typescript
if (!user) return NextResponse.json({ error: '...' }, { status: 401 })
if (!requiredField) return NextResponse.json({ error: '...' }, { status: 400 })
if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
return NextResponse.json({ success: true, ... })
```

**Client error display:**
- `useState<string | null>(null)` for error state
- Displayed inline as styled `<p>` element with `text-red-600 bg-red-50` styling
- `useTransition` wraps async calls; `isPending` disables form submit button

**Auth guard pattern:**
- `assertAdmin()` helper throws `Error('Sin permisos')` for privilege checks in admin actions
- `assertTutoraOrAdmin()` for multi-role checks
- Middleware redirects unauthenticated users to `/login`

## Import Conventions

**Path alias:**
- `@/` maps to `src/` — `import { createClient } from '@/lib/supabase/server'`
- No relative imports with `../` used; always use `@/` alias

**Import ordering (not enforced by tooling, but consistent in practice):**
1. Next.js and React imports — `import { useState } from 'react'`; `import { notFound } from 'next/navigation'`
2. Third-party libraries — `import Image from 'next/image'`
3. Internal Server/Client utilities — `import { createClient } from '@/lib/supabase/server'`
4. Internal query modules — `import { getPlayersByDivision } from '@/lib/queries/players'`
5. Internal components — `import { PlayerNotes } from '@/components/players/PlayerNotes'`
6. Types — `import type { Player, Division } from '@/types'`

**Export style:**
- Named exports for components and functions — `export function PlayerNotes(...)`
- No default exports for components (exception: Next.js page/layout files require `export default`)
- Type re-exports from module files — `export type { DocType }` implicitly via `export type DocType = ...`

## Comment Conventions

**When to comment:**
- Module-level JSDoc for utility files — `src/lib/utils/dates.ts` and `src/lib/utils/whatsapp.ts` use JSDoc `/** ... */`
- Inline comments for non-obvious logic — Supabase join behavior, sorting rationale, Spanish-language context notes
- Section headers within long files using `// ── Section Name ───` pattern (seen in `stats.ts`)
- Spanish is acceptable in comments matching the app's domain language

**What NOT to comment:**
- Self-evident code
- Code that TypeScript types already explain

**JSDoc usage:**
- Used in `src/lib/utils/` utility files for exported functions
- Not used in components or query files

---

*Convention analysis: 2026-04-11*
