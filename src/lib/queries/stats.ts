import { createClient } from '@/lib/supabase/server'

export type PlayerStat = {
  player_id: string
  first_name: string
  last_name: string
  photo_url: string | null
  parent_name: string | null
  parent_phone: string | null
  total_sessions: number
  sessions_present: number
  attendance_pct: number | null
}

function mapStat(r: PlayerStat): PlayerStat {
  return {
    ...r,
    total_sessions: Number(r.total_sessions),
    sessions_present: Number(r.sessions_present),
    attendance_pct: r.attendance_pct !== null ? Number(r.attendance_pct) : null,
  }
}

export async function getStatsByDays(
  divisionId: string,
  days = 60
): Promise<PlayerStat[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_attendance_stats_days', {
    p_division_id: divisionId,
    p_days: days,
  })
  if (error) throw error
  return (data ?? []).map(mapStat)
}

export async function getStatsBySessions(
  divisionId: string,
  sessions = 10
): Promise<PlayerStat[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_attendance_stats_sessions', {
    p_division_id: divisionId,
    p_sessions: sessions,
  })
  if (error) throw error
  return (data ?? []).map(mapStat)
}

export async function getStatsByYear(
  divisionId: string,
  year?: number
): Promise<PlayerStat[]> {
  const supabase = await createClient()
  const params: Record<string, unknown> = { p_division_id: divisionId }
  if (year !== undefined) params.p_year = year
  const { data, error } = await supabase.rpc('get_attendance_stats_year', params)
  if (error) throw error
  return (data ?? []).map(mapStat)
}

export async function getStatsSinceAlta(
  divisionId: string
): Promise<PlayerStat[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_attendance_stats_since_alta', {
    p_division_id: divisionId,
  })
  if (error) throw error
  return (data ?? []).map(mapStat)
}
