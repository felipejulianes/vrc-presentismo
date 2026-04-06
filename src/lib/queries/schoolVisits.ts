import { createClient } from '@/lib/supabase/server'
import type { SchoolVisit } from '@/types'

export type SchoolMatrixRow = {
  school_id: string
  school_name: string
  divisions: Record<string, number>  // division_id → player count
}

export async function getSchoolsMatrix(): Promise<SchoolMatrixRow[]> {
  const supabase = await createClient()

  // Todos los jugadores activos con colegio asignado
  const { data: players, error } = await supabase
    .from('players')
    .select('school_id, division_id, schools(name)')
    .eq('active', true)
    .eq('inactivo', false)
    .not('school_id', 'is', null)

  if (error || !players) return []

  const map: Record<string, SchoolMatrixRow> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of players as any[]) {
    if (!p.school_id) continue
    const schoolName = (Array.isArray(p.schools) ? p.schools[0]?.name : p.schools?.name) ?? '(sin nombre)'
    if (!map[p.school_id]) {
      map[p.school_id] = { school_id: p.school_id, school_name: schoolName, divisions: {} }
    }
    map[p.school_id].divisions[p.division_id] = (map[p.school_id].divisions[p.division_id] ?? 0) + 1
  }

  return Object.values(map).sort((a, b) => a.school_name.localeCompare(b.school_name))
}

export type SchoolPlayerRow = {
  player_id: string
  first_name: string
  last_name: string
  sobrenombre: string | null
  photo_url: string | null
  division_id: string
  division_name: string
  grado: string | null
  parent_phone: string | null
  parent_name: string | null
}

export async function getPlayersBySchool(schoolId: string): Promise<SchoolPlayerRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('players')
    .select('id, first_name, last_name, sobrenombre, photo_url, division_id, grado, parent_phone, parent_name, divisions(name)')
    .eq('school_id', schoolId)
    .eq('active', true)
    .order('last_name')
    .order('first_name')

  if (error || !data) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map(p => ({
    player_id: p.id,
    first_name: p.first_name,
    last_name: p.last_name,
    sobrenombre: p.sobrenombre,
    photo_url: p.photo_url,
    division_id: p.division_id,
    division_name: (Array.isArray(p.divisions) ? p.divisions[0]?.name : p.divisions?.name) ?? '',
    grado: p.grado,
    parent_phone: p.parent_phone,
    parent_name: p.parent_name,
  }))
}

export async function getVisitsBySchool(schoolId: string): Promise<SchoolVisit[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('school_visits')
    .select('*')
    .eq('school_id', schoolId)
    .order('visit_date', { ascending: false })

  if (error) return []
  return data ?? []
}

export async function getAllVisits(): Promise<(SchoolVisit & { school_name: string })[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('school_visits')
    .select('*, schools(name)')
    .order('visit_date', { ascending: true })

  if (error) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((v: any) => ({
    ...v,
    school_name: (Array.isArray(v.schools) ? v.schools[0]?.name : v.schools?.name) ?? '',
  }))
}
