# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# VRC Presentismo — Contexto para agentes de IA

## Qué es esto
App web PWA para que entrenadores de **Virreyes Rugby Club** (Buenos Aires, Argentina) tomen lista en los entrenamientos y gestionen la coordinación del club (fixture, bondis, tercer tiempo) desde el celular. Instalable como app nativa (standalone PWA).

## Stack
- **Frontend**: Next.js 14 App Router · TypeScript · Tailwind CSS · next-pwa · Recharts
- **Backend/DB/Auth/Storage**: Supabase (PostgreSQL + Auth + Storage)
- **Deploy**: Vercel (frontend) + Supabase cloud — CI automático desde GitHub en ~2 min
- **Repo**: https://github.com/felipejulianes/vrc-presentismo

## Comandos de desarrollo
```bash
npm run dev      # servidor local (localhost:3000)
npm run build    # build de producción — verifica TypeScript (zero errors requerido antes de push)
npm run lint     # ESLint con next/core-web-vitals + next/typescript
```

No hay test suite configurado. `playwright` está en devDependencies pero sin scripts de test definidos.

**Workflow**: editar → `npm run build` → commit → push → Vercel despliega en ~2 min.

## Roles de usuario
| Rol | Acceso |
|-----|--------|
| `coach` (entrenador) | Solo sus divisiones asignadas. Si tiene 1 → va directo sin selector |
| `admin` | Todo: coordina fixture, gestiona entrenadores, ejecuta avance de categoría |
| `tutora` | Panel propio: entrevistas, visitas a colegios, docs de jugadores |

El rol se guarda en `profiles.role`. El valor `'coach'` se muestra como "Entrenador" en la UI. Cuentas recién creadas sin división asignada ven una pantalla de "cuenta pendiente de activación".

## Divisiones
`M6 → M7 → M8 → M9 → M10 → M11 → M12 → M13 → M14 → M15 → M16 → M17 → M19 → alumni (baja)`

Prerugby (M6/M7/M8) se maneja junto para el entrenador pero son 3 filas separadas en DB.

## Estructura de rutas
```
/login                                 — email+pass o Google OAuth
/auth/callback                         — maneja tokens OAuth y reset de contraseña
/auth/reset-password                   — form para nueva contraseña (via email link)

/(app)
  /                                    — redirect a /attendance

  — ASISTENCIA —
  /attendance                          — selector de división (redirect si hay 1 sola)
  /attendance/[divisionId]             — historial de sesiones de la división
  /attendance/[divisionId]/new         — tomar asistencia (grilla + date picker)
  /attendance/[divisionId]/[sessionId] — ver/editar sesión: banner de actividad, grilla, tercer tiempo (local)
  /attendance/[divisionId]/tabla       — tabla cruzada jugadores×fechas + stats + export Excel

  — JUGADORES —
  /players                             — listado con buscador, agrupado por división
  /players/new                         — alta de jugador
  /players/[playerId]                  — ficha: foto, stats, contacto, dirección, bitácora, seguimientos, entrevistas
  /players/[playerId]/edit             — edición completa del jugador

  — ESTADÍSTICAS —
  /stats                               — selector de división (admin ve overview global)
  /stats/[divisionId]                  — KPIs + gráficos: año/30d/desde alta/tendencia sesión

  — DOCUMENTACIÓN —
  /docs                                — dashboard de docs: overview por división
  /progression                         — preview + ejecución de avance de categoría anual

  — RECURSOS —
  /clubs                               — browser de 90 clubes URBA (coach view)
  /wiki                                — reglamento rugby + ejercicios (markdown, editable por admin)
  /ayuda                               — guía de uso (2 tabs: entrenador / coordinación)
  /more                                — menú de recursos: ayuda, settings, clubes, wiki
  /settings                            — configuración de cuenta: info, cambio de contraseña, logout

  — PANEL ADMIN —
  /admin                               — dashboard: KPIs globales + accesos rápidos
  /admin/hoy                           — asistencia cruzada del día con date picker
  /admin/coaches                       — CRUD de usuarios (coach/admin/tutora)
  /admin/coaches/new                   — crear usuario con rol y divisiones
  /admin/coaches/[coachId]             — editar rol, divisiones asignadas, eliminar

  — COORDINACIÓN (SÁBADOS) —
  /admin/sabados                       — fixture: sábados con resumen de actividades
  /admin/sabados/tabla                 — tabla anual: divisiones × fechas, códigos E/L/V
  /admin/sabados/[date]                — configurar un sábado: actividad por división + bondi + links
  /admin/tercer-tiempo                 — grid tercer tiempo: selector de fecha, cantidades, visitantes
  /admin/buses                         — catálogo global de bondis (chofer, patente, teléfono)
  /admin/clubs                         — gestión de clubes rivales + herramienta geocoding de sedes
  /admin/schools                       — redirect → /tutoras/schools

  — PANEL TUTORAS —
  /tutoras                             — dashboard: KPIs docs + links rápidos + próximas visitas
  /tutoras/docs                        — tabla de jugadores × tipos de doc (DNI/apto/ficha)
  /tutoras/players                     — tabla de jugadores con foco en colegio y división
  /tutoras/schools                     — matrix colegios × divisiones + conteos + visitas
  /tutoras/schools/[schoolId]          — detalle colegio: jugadores, historial de visitas, agregar visita
  /tutoras/interviews                  — log global de entrevistas (admin + tutoras)

/api/attendance                        — POST: upsert session + attendance records
/api/attendance/[divisionId]/export    — GET: descarga Excel de la tabla de asistencia
/api/geocode                           — GET: proxy Nominatim (solo usuarios autenticados)
```

## Arquitectura de layouts

El route group `(app)` tiene un Server Component layout (`src/app/(app)/layout.tsx`) que actúa como segunda capa de auth: verifica perfil y divisiones asignadas, muestra la pantalla "cuenta pendiente" si el coach no tiene divisiones, y renderiza el header verde + `<BottomNav>` para el resto. El middleware (`src/middleware.ts`) es la primera capa: redirige a `/login` si no hay sesión.

## Schema de base de datos (Supabase/PostgreSQL)

33 migraciones aplicadas (`001` → `033`). Tablas principales:

```sql
divisions              id, name, category, sort_order, min_age, max_age
profiles               id (→ auth.users), role ('admin'|'coach'|'tutora'), full_name
coach_divisions        coach_id → profiles, division_id → divisions

players                id, first_name, last_name, dni (UNIQUE), birth_date,
                       sobrenombre, inactivo (bool), fecha_alta (date),
                       school_id → schools, como_conocio,
                       parent_name, parent_phone,
                       referente2_name, referente2_phone,
                       photo_url, division_id, active,
                       address, lat, lng, maps_url

training_sessions      id, division_id, session_date, created_by, notes, session_type
                       UNIQUE(division_id, session_date)
                       session_type ('sabado'|'semana') lo clasifica AUTOMÁTICAMENTE
                       un trigger según el día (fin de semana → 'sabado', resto → 'semana').
                       No setear session_type a mano; el trigger lo sobreescribe.
                       Entrenamientos: martes+jueves desde 2026-08-04 (antes: miércoles).

attendance_records     session_id, player_id, present (bool)
                       UNIQUE(session_id, player_id)

player_documents       id, player_id, doc_type ('dni'|'apto_medico'|'ficha'),
                       received_at, received_by
                       UNIQUE(player_id, doc_type)

player_notes           id, player_id, note_date, content, created_by
                       — Bitácora del entrenador; viaja con el jugador entre divisiones

player_followups       id, player_id, contact_date, contact_type, notes, created_by
                       contact_type: 'llamada'|'whatsapp'|'mensaje'|'reunion'|'otro'

schools                id, name, aliases (text[]), address, lat, lng, maps_url, active

opponent_clubs         id, name, short_name, address, coordinator_name,
                       coordinator_phone, active
                       — 90 clubes URBA pre-cargados

club_venues            id, club_id → opponent_clubs, name, address, lat, lng, maps_url
                       — Sedes de cada club rival

division_activities    id, division_id, activity_date, activity_type ('entrenamiento'|'local'|'visitante'),
                       opponent_club_ids (int[]), venue_id → club_venues, bus_id → buses

buses                  id, name, driver_name, driver_phone, patente, active
                       — Catálogo global de bondis

tercer_tiempo_reports  id, activity_date, division_id, coach_declared_qty,
                       coordinator_confirmed_qty, staff_qty, notes

tercer_tiempo_visitors id, report_id → tercer_tiempo_reports, club_id → opponent_clubs, qty

wiki_pages             id, title, slug (UNIQUE), content (markdown), category, published
```

### Funciones RPC relevantes
| Función | Descripción |
|---------|-------------|
| `get_attendance_stats_year(division_id, year)` | Stats del año calendario |
| `get_attendance_stats_days(division_id, days)` | Stats últimos N días |
| `get_attendance_stats_sessions(division_id, sessions)` | Stats últimas N sesiones |
| `get_attendance_stats_since_alta(division_id)` | Stats desde fecha_alta del jugador |
| `preview_annual_progression()` | Preview del avance de categoría |
| `execute_annual_progression()` | Ejecuta avance (irreversible, service_role) |

### Helpers RLS
- `get_user_role()` → rol del usuario autenticado
- `coach_has_division(div_id)` → si el coach tiene esa división asignada

## Variables de entorno
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   ← solo servidor, nunca NEXT_PUBLIC_
```

## Archivos clave

### Tipos globales
| Archivo | Qué hace |
|---------|----------|
| `src/types/index.ts` | Tipos TypeScript compartidos: `Player`, `Division`, `TrainingSession`, `AttendanceRecord`, `Profile`, `PlayerInterview`, `SchoolVisit`, `AttendanceState` |

### Supabase clients
| Archivo | Qué hace |
|---------|----------|
| `src/lib/supabase/server.ts` | Cliente para Server Components |
| `src/lib/supabase/client.ts` | Cliente para Client Components |
| `src/lib/supabase/admin.ts` | Cliente service_role (bypassa RLS) |

### Queries (src/lib/queries/)
| Archivo | Qué hace |
|---------|----------|
| `players.ts` | Queries de jugadores con RLS automático |
| `attendance.ts` | Sesiones y registros de asistencia |
| `stats.ts` | Estadísticas vía RPC |
| `docs.ts` | Documentación de jugadores |
| `sabados.ts` | Actividades del sábado, clubes, bondis, tercer tiempo |
| `schools.ts` | Colegios con búsqueda por nombre/alias |
| `schoolVisits.ts` | Visitas de tutoras a colegios |
| `interviews.ts` | Entrevistas tutora/jugador |
| `wiki.ts` | Páginas del wiki por categoría/slug |

### Auth, offline y utils
| Archivo | Qué hace |
|---------|----------|
| `src/lib/auth/guards.ts` | `assertAdmin()` y `assertTutoraOrAdmin()` para server actions |
| `src/lib/offline/attendanceQueue.ts` | Cola IndexedDB para asistencia offline (idb@8) |
| `src/lib/hooks/useAttendance.ts` | Hook: toggle, save, queue offline, drain on reconnect |
| `src/lib/utils/dates.ts` | Helpers: `getTodayISO()`, `formatShortDate()`, `daysAgoISO()`, etc. |
| `src/lib/utils/whatsapp.ts` | Formateo 549+número para wa.me |
| `src/lib/docs/constants.ts` | Tipos/constantes de docs (sin imports Supabase, usable en client) |

### Server actions
| Archivo | Qué hace |
|---------|----------|
| `src/app/(app)/admin/actions.ts` | CRUD coaches, createCoach, createTutora, assertAdmin |
| `src/app/(app)/admin/sabados/actions.ts` | Gestión de actividades del sábado (12 actions) |
| `src/app/(app)/admin/buses/actions.ts` | CRUD bondis |
| `src/app/(app)/admin/schools/actions.ts` | redirect, gestión de colegios vía admin |
| `src/app/(app)/wiki/actions.ts` | saveWikiPage, deleteWikiPage (admin only) |
| `src/app/(app)/tutoras/actions.ts` | Entrevistas, visitas a colegios |
| `src/app/(app)/docs/actions.ts` | Marcar docs recibidos |
| `src/app/(app)/players/[playerId]/actions.ts` | Notas y seguimientos del jugador |

### APIs y middleware
| Archivo | Qué hace |
|---------|----------|
| `src/app/api/attendance/route.ts` | POST: upsert sesión + registros de asistencia |
| `src/app/api/attendance/[divisionId]/export/route.ts` | GET: Excel con exceljs |
| `src/app/api/geocode/route.ts` | Proxy Nominatim autenticado |
| `src/middleware.ts` | Auth guard: no auth → /login; user en /login → /attendance |

## Convenciones importantes

### Supabase joins devuelven array, no objeto
```typescript
// CORRECTO
division_name: Array.isArray(p.divisions) ? p.divisions[0]?.name : p.divisions?.name
```

### Clientes Supabase
- Server Components → `createClient()` de `@/lib/supabase/server`
- Client Components → `createClient()` de `@/lib/supabase/client`
- Admin (service_role) → `createAdminClient()` de `@/lib/supabase/admin`
- **Nunca importar `server.ts` desde un Client Component** (rompe el build)

### Supabase max-rows=1000 — pitfall crítico
El proyecto Supabase tiene `max-rows=1000` configurado en PostgREST. Esto **sobreescribe cualquier `.limit()` del cliente** y aplica a todos los roles, incluyendo `service_role`. Para queries que pueden devolver >1000 filas (ej: attendance_records en stats), usar paginación explícita:
```typescript
const PAGE = 1000
let all: Row[] = []
let offset = 0
while (true) {
  const { data: batch } = await supabase
    .from('tabla')
    .select('...')
    .range(offset, offset + PAGE - 1)
  if (!batch || batch.length === 0) break
  all = all.concat(batch)
  if (batch.length < PAGE) break
  offset += PAGE
}
```
`createAdminClient()` bypasea RLS pero **no** bypasea max-rows.

### Server actions — siempre con guard primero
```typescript
// Toda action de admin empieza así:
await assertAdmin()   // lanza error si no es admin — importar de @/lib/auth/guards
```

### Constantes compartidas client/server
Si un tipo o constante se necesita tanto en Server como en Client Components, va en un archivo separado sin imports de Supabase (ej: `src/lib/docs/constants.ts`).

### WhatsApp — formato argentino
`549` + número sin 0 inicial ni 15. Usar `formatWhatsAppNumber()` de `@/lib/utils/whatsapp.ts`.

### Fechas — siempre centralizadas
Usar helpers de `src/lib/utils/dates.ts`. No inline `new Date().toISOString()` en componentes.

### Jugadores inactivos
`inactivo=true` no es lo mismo que `active=false`.
- `active=false` → dado de baja (no aparece en ningún lado)
- `inactivo=true` → sigue activo pero va al final de las listas

### Colores del club
```
verde:   #2b7a2b  (vrc-green en Tailwind)
naranja: #e07020  (vrc-orange)
dorado:  #f5c020  (vrc-gold)
```

## Dependencias de producción clave
| Paquete | Versión | Uso |
|---------|---------|-----|
| `next` | 14.2.35 | Framework (App Router) |
| `@supabase/ssr` | 0.10.2 (pinned) | SSR + cookies |
| `@supabase/supabase-js` | ^2.102.1 | Client |
| `idb` | ^8.0.2 | IndexedDB wrapper (offline queue) |
| `exceljs` | ^4.4.0 | Export Excel (reemplazó xlsx por CVE) |
| `recharts` | ^3.8.1 | Gráficos en stats |
| `react-markdown` | ^10.1.0 | Render markdown en wiki |
| `remark-gfm` | ^4.0.1 | Tablas GFM en wiki |
| `next-pwa` | ^5.6.0 | Service worker + instalable |

## Assets en /public
| Archivo | Uso |
|---------|-----|
| `logo.png` | Logo completo con texto — pantalla de login |
| `isotipo.png` | Solo pelota+cintas — header de la app |
| `foto-infantiles.jpg` | Foto de equipo infantil — fondo de login |
| `manifest.json` | Configuración PWA |
| `icons/icon-192.png` | Ícono PWA 192×192 (pendiente: usar logo del club) |
| `icons/icon-512.png` | Ícono PWA 512×512 (pendiente: usar logo del club) |

## Workflow de desarrollo
1. Cambios en código → `npm run build` para verificar (zero TypeScript errors)
2. `git add ... && git commit && git push origin main`
3. Vercel despliega automáticamente en ~2 minutos
4. Migraciones de DB → correr manualmente en Supabase SQL Editor

**No hay branches ni PRs** — se trabaja directo en `main` (proyecto personal/equipo chico).
