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

export type SessionTrend = {
  session_date: string
  present_count: number
  total_count: number
  attendance_pct: number | null
}

export async function getSessionTrend(
  divisionId: string,
  limit = 20
): Promise<SessionTrend[]> {
  const supabase = await createClient()

  const { data: sessions } = await supabase
    .from('training_sessions')
    .select('id, session_date')
    .eq('division_id', divisionId)
    .order('session_date', { ascending: false })
    .limit(limit)

  if (!sessions || sessions.length === 0) return []

  const sessionIds = sessions.map(s => s.id)

  const { data: records } = await supabase
    .from('attendance_records')
    .select('session_id, present')
    .in('session_id', sessionIds)

  const countMap: Record<string, { present: number; total: number }> = {}
  for (const s of sessions) countMap[s.id] = { present: 0, total: 0 }
  for (const r of records ?? []) {
    if (countMap[r.session_id]) {
      countMap[r.session_id].total++
      if (r.present) countMap[r.session_id].present++
    }
  }

  return sessions.map(s => {
    const { present, total } = countMap[s.id]
    return {
      session_date: s.session_date,
      present_count: present,
      total_count: total,
      attendance_pct: total > 0 ? Math.round((present / total) * 100) : null,
    }
  })
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
