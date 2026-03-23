# VRC Presentismo — Contexto para agentes de IA

## Qué es esto
App web PWA para que entrenadores de **Virreyes Rugby Club** (Buenos Aires, Argentina) tomen lista en los entrenamientos desde el celular. Instalable como app nativa (standalone PWA).

## Stack
- **Frontend**: Next.js 14 App Router · TypeScript · Tailwind CSS · next-pwa
- **Backend/DB/Auth/Storage**: Supabase (PostgreSQL + Auth + Storage)
- **Deploy**: Vercel (frontend) + Supabase cloud
- **Repo**: https://github.com/felipejulianes/vrc-presentismo

## Roles de usuario
| Rol | Acceso |
|-----|--------|
| `coach` (entrenador) | Solo sus divisiones asignadas. Si tiene 1 → va directo sin selector |
| `admin` | Todo. Gestiona entrenadores, ejecuta avance de categoría |

El rol se guarda en `profiles.role`. El valor en DB es `'coach'` aunque en la UI se muestra "Entrenador".

## Divisiones
`M6 → M7 → M8 → M9 → M10 → M11 → M12 → M13 → M14 → M15 → M16 → M17 → M19 → alumni (baja)`

Prerugby (M6/M7/M8) se maneja junto para el entrenador pero son 3 filas separadas en DB.

## Estructura de rutas
```
/login                          — pantalla de ingreso
/(app)
  /players                      — listado de jugadores (agrupado por división)
  /players/new                  — alta de jugador
  /players/[playerId]           — detalle del jugador (foto grande, stats, contacto)
  /players/[playerId]/edit      — edición del jugador
  /attendance                   — selector de división (o redirect si hay 1 sola)
  /attendance/[divisionId]      — historial de sesiones de esa división
  /attendance/[divisionId]/new  — tomar asistencia (grilla + date picker)
  /attendance/[divisionId]/[sessionId] — ver/editar sesión existente
  /docs                         — documentación por jugador (DNI, apto médico, ficha)
  /stats                        — selector de división para estadísticas
  /stats/[divisionId]           — stats: año actual / últimos 60d / desde alta / tendencia por sesión
  /admin                        — dashboard admin
  /admin/hoy                    — vista del día: asistencia cruzada de todas las divisiones
  /admin/coaches                — listado de entrenadores
  /admin/coaches/new            — crear entrenador
  /admin/coaches/[coachId]      — editar entrenador (divisiones asignadas)
  /admin/progression            — avance de categoría anual (irreversible)
```

## Schema de base de datos (Supabase/PostgreSQL)

### Tablas principales
```sql
divisions         id, name, category, sort_order, min_age, max_age
profiles          id (→ auth.users), role ('admin'|'coach'), full_name
coach_divisions   coach_id → profiles, division_id → divisions
players           id, first_name, last_name, dni (UNIQUE), birth_date,
                  sobrenombre, inactivo (bool), fecha_alta (date), colegio,
                  parent_name, parent_phone, photo_url, division_id, active
training_sessions id, division_id, session_date, created_by, notes
                  UNIQUE(division_id, session_date)
attendance_records session_id, player_id, present (bool)
                  UNIQUE(session_id, player_id)
player_documents  id, player_id, doc_type ('dni'|'apto_medico'|'ficha'),
                  received_at, received_by
                  UNIQUE(player_id, doc_type)
player_notes      id, player_id, note_date, content, created_by
                  — Bitácora del entrenador; viaja con el jugador entre divisiones
                  — Visible para todos los que acceden al jugador
player_followups  id, player_id, contact_date, contact_type, notes, created_by
                  contact_type: 'llamada'|'whatsapp'|'mensaje'|'reunion'|'otro'
                  — Registro de contactos con el padre/madre de un jugador ausente
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
| Archivo | Qué hace |
|---------|----------|
| `src/lib/supabase/server.ts` | Cliente Supabase para Server Components |
| `src/lib/supabase/client.ts` | Cliente Supabase para Client Components |
| `src/lib/supabase/admin.ts` | Cliente con service_role (bypassa RLS) |
| `src/lib/queries/players.ts` | Queries de jugadores con RLS automático |
| `src/lib/queries/attendance.ts` | Queries de sesiones y asistencia |
| `src/lib/queries/stats.ts` | Estadísticas vía RPC |
| `src/lib/queries/docs.ts` | Documentación de jugadores |
| `src/lib/docs/constants.ts` | Tipos/constantes de docs (sin imports server) |
| `src/lib/utils/whatsapp.ts` | Formateo de números argentinos para wa.me |
| `src/app/(app)/admin/actions.ts` | Server actions admin |
| `src/app/(app)/docs/actions.ts` | Server actions documentación |
| `src/app/(app)/players/[playerId]/actions.ts` | Server actions notas y seguimientos |
| `src/app/api/attendance/route.ts` | POST upsert de asistencia |
| `src/components/players/FollowupLog.tsx` | Log de seguimientos de ausentes (client) |
| `src/components/players/PlayerNotes.tsx` | Bitácora del entrenador (client) |
| `src/app/(app)/admin/hoy/page.tsx` | Vista del día: asistencia cruzada |
| `src/middleware.ts` | Auth guard: no auth → /login |
| `supabase/migrations/` | Todas las migraciones en orden (001→009) |

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

### Constantes compartidas client/server
Si un tipo o constante se necesita tanto en Server como en Client Components, va en un archivo separado sin imports de Supabase (ej: `src/lib/docs/constants.ts`).

### WhatsApp — formato argentino
`549` + número sin 0 inicial ni 15. Usar `formatWhatsAppNumber()` de `@/lib/utils/whatsapp.ts`.

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

## Assets en /public
| Archivo | Uso |
|---------|-----|
| `logo.png` | Logo completo con texto — pantalla de login |
| `isotipo.png` | Solo pelota+cintas (landscape) — header de la app |
| `foto-infantiles.jpg` | Foto de equipo infantil — fondo de login |
| `manifest.json` | Configuración PWA |
| `icons/icon-192.png` | Ícono PWA 192×192 |
| `icons/icon-512.png` | Ícono PWA 512×512 |

## Estado actual de funcionalidades
| Feature | Estado |
|---------|--------|
| Auth (login/logout) | ✅ |
| Toma de lista con grilla de jugadores | ✅ |
| Historial de sesiones por división | ✅ |
| CRUD jugadores + foto con cámara | ✅ |
| Estadísticas de asistencia (año/60d/desde alta) | ✅ |
| Tendencia por sesión (tab Tendencia en stats) | ✅ |
| Links WhatsApp para contactar padres | ✅ |
| Panel admin (entrenadores, divisiones) | ✅ |
| Admin: vista del día (asistencia cruzada) | ✅ |
| Avance de categoría anual | ✅ |
| Sección Documentación (DNI/apto/ficha) | ✅ |
| Seguimiento de ausentes (log por jugador) | ✅ |
| Bitácora del entrenador (notas por jugador) | ✅ |
| PWA instalable | ✅ |
| Íconos PWA personalizados | ⚠️ pendiente (usar logo del club) |
| Offline queue para asistencia | ⚠️ pendiente |

## Workflow de desarrollo
1. Cambios en código → `npm run build` para verificar
2. `git add ... && git commit && git push origin main`
3. Vercel despliega automáticamente en ~2 minutos
4. Migraciones de DB → correr manualmente en Supabase SQL Editor

**No hay branches ni PRs** — se trabaja directo en `main` (proyecto personal/equipo chico).
