import { createClient } from '@/lib/supabase/server'
import type { Player, Division } from '@/types'

const PLAYER_FIELDS = 'id, first_name, last_name, dni, birth_date, photo_url, division_id, active, inactivo, parent_name, parent_phone, parent_name_2, parent_phone_2, sobrenombre, fecha_alta, colegio, school_id, como_conocio, grado'

const FULL_ACCESS_ROLES = ['admin', 'tutora']

export async function getPlayersByDivision(divisionId: string): Promise<Player[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('players')
    .select(PLAYER_FIELDS)
    .eq('division_id', divisionId)
    .eq('active', true)
    .order('inactivo')         // false (activo) primero
    .order('last_name')
    .order('first_name')

  if (error) throw error
  return data
}

export async function getPlayersForUser(): Promise<(Player & { division_name: string })[]> {
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
    .select(PLAYER_FIELDS + ', divisions(name)')
    .eq('active', true)
    .order('inactivo')
    .order('last_name')
    .order('first_name')

  if (!FULL_ACCESS_ROLES.includes(profile?.role)) {
    const { data: cd } = await supabase
      .from('coach_divisions')
      .select('division_id')
      .eq('coach_id', user.id)
    const ids = cd?.map((r: { division_id: string }) => r.division_id) ?? []
    if (ids.length === 0) return []
    query = query.in('division_id', ids)
  }

  const { data, error } = await query
  if (error) throw error

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((p: any) => ({
    ...p,
    division_name: (Array.isArray(p.divisions) ? p.divisions[0]?.name : p.divisions?.name) ?? '',
  }))
}

export async function getPlayerById(id: string): Promise<Player | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('players')
    .select(PLAYER_FIELDS)
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function getDivisionsForUser(): Promise<Division[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (FULL_ACCESS_ROLES.includes(profile?.role)) {
    const { data, error } = await supabase
      .from('divisions')
      .select('*')
      .eq('is_juvenile', false)
      .order('sort_order')
    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('coach_divisions')
    .select('divisions(*)')
    .eq('coach_id', user.id)

  if (error) throw error
  return ((data?.map((r: { divisions: unknown }) => r.divisions) ?? []) as Division[])
    .filter((d: Division) => !d.is_juvenile)
    .sort((a, b) => a.sort_order - b.sort_order)
}
