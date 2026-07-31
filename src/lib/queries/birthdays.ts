import { createClient } from '@/lib/supabase/server'
import { getBirthdayOccurrence, type BirthdayBucket } from '@/lib/utils/birthdays'

export type { BirthdayBucket } from '@/lib/utils/birthdays'

const FULL_ACCESS_ROLES = ['admin', 'tutora']

export type BirthdayEntry = {
  player_id: string
  first_name: string
  last_name: string
  sobrenombre: string | null
  photo_url: string | null
  division_id: string
  division_name: string
  division_sort: number
  parent_name: string | null
  parent_phone: string | null
  date: string          // ISO YYYY-MM-DD de la ocurrencia
  age: number
  bucket: BirthdayBucket
}

export type BirthdaysResult = {
  isAdmin: boolean
  entries: BirthdayEntry[]
}

type PlayerRow = {
  id: string
  first_name: string
  last_name: string
  sobrenombre: string | null
  photo_url: string | null
  birth_date: string | null
  parent_name: string | null
  parent_phone: string | null
  division_id: string
  // Supabase devuelve el join como objeto o array
  divisions: { name: string; is_juvenile: boolean; sort_order: number } | { name: string; is_juvenile: boolean; sort_order: number }[] | null
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function divOf(p: PlayerRow) {
  return Array.isArray(p.divisions) ? p.divisions[0] : p.divisions
}

// Trae jugadores activos en el scope del usuario (coach → sus divisiones).
// Solo infantiles: excluye divisiones juveniles.
async function fetchScopedPlayers(): Promise<PlayerRow[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  let query = supabase
    .from('players')
    .select('id, first_name, last_name, sobrenombre, photo_url, birth_date, parent_name, parent_phone, division_id, divisions(name, is_juvenile, sort_order)')
    .eq('active', true)

  if (!FULL_ACCESS_ROLES.includes(profile?.role)) {
    const { data: cd } = await supabase
      .from('coach_divisions')
      .select('division_id')
      .eq('coach_id', user.id)
    const ids = cd?.map((r: { division_id: string }) => r.division_id) ?? []
    if (ids.length === 0) return []
    query = query.in('division_id', ids)
  }

  const { data } = await query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []) as any as PlayerRow[]
}

async function getRole(): Promise<string | undefined> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return undefined
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role
}

export async function getBirthdays(): Promise<BirthdaysResult> {
  const [rows, role] = await Promise.all([fetchScopedPlayers(), getRole()])
  const today = new Date()
  const entries: BirthdayEntry[] = []

  for (const p of rows) {
    const div = divOf(p)
    if (div?.is_juvenile) continue           // solo infantiles
    const occ = getBirthdayOccurrence(p.birth_date, today)
    if (!occ) continue
    entries.push({
      player_id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      sobrenombre: p.sobrenombre,
      photo_url: p.photo_url,
      division_id: p.division_id,
      division_name: div?.name ?? '',
      division_sort: div?.sort_order ?? 0,
      parent_name: p.parent_name,
      parent_phone: p.parent_phone,
      date: toISO(occ.date),
      age: occ.age,
      bucket: occ.bucket,
    })
  }

  entries.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.last_name.localeCompare(b.last_name)))
  return { isAdmin: role === 'admin', entries }
}

// Conteo de cumpleaños de HOY en el scope del usuario (para el punto del header).
export async function countBirthdaysToday(): Promise<number> {
  const rows = await fetchScopedPlayers()
  const today = new Date()
  let n = 0
  for (const p of rows) {
    const div = divOf(p)
    if (div?.is_juvenile) continue
    const occ = getBirthdayOccurrence(p.birth_date, today)
    if (occ?.bucket === 'hoy') n++
  }
  return n
}
