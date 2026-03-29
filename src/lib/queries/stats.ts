import { createClient } from '@/lib/supabase/server'
import { daysAgoISO } from '@/lib/utils/dates'

// Divisiones visibles (solo infantiles, M6-M14)
const JUVENILE_NAMES = ['M15', 'M16', 'M17', 'M19', 'alumni']

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

export async function getStatsByDays(divisionId: string, days = 60): Promise<PlayerStat[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_attendance_stats_days', {
    p_division_id: divisionId,
    p_days: days,
  })
  if (error) throw error
  return (data ?? []).map(mapStat)
}

export async function getStatsBySessions(divisionId: string, sessions = 10): Promise<PlayerStat[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_attendance_stats_sessions', {
    p_division_id: divisionId,
    p_sessions: sessions,
  })
  if (error) throw error
  return (data ?? []).map(mapStat)
}

export async function getStatsByYear(divisionId: string, year?: number): Promise<PlayerStat[]> {
  const supabase = await createClient()
  const params: Record<string, unknown> = { p_division_id: divisionId }
  if (year !== undefined) params.p_year = year
  const { data, error } = await supabase.rpc('get_attendance_stats_year', params)
  if (error) throw error
  return (data ?? []).map(mapStat)
}

export async function getStatsSinceAlta(divisionId: string): Promise<PlayerStat[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_attendance_stats_since_alta', {
    p_division_id: divisionId,
  })
  if (error) throw error
  return (data ?? []).map(mapStat)
}

// ── Session trend ───────────────────────────────────────────

export type SessionTrend = {
  session_date: string
  present_count: number
  total_count: number
  attendance_pct: number | null
}

export async function getSessionTrend(divisionId: string, limit = 50): Promise<SessionTrend[]> {
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

  // Return oldest-first for chart
  return sessions
    .map(s => {
      const { present, total } = countMap[s.id]
      return {
        session_date: s.session_date,
        present_count: present,
        total_count: total,
        attendance_pct: total > 0 ? Math.round((present / total) * 100) : null,
      }
    })
    .reverse()
}

// ── Division KPIs (coach) ───────────────────────────────────

export type DivisionKpis = {
  totalActive: number
  came30d: number
}

export async function getDivisionKpis(divisionId: string): Promise<DivisionKpis> {
  const supabase = await createClient()

  const [{ count: totalActive }, recentResult] = await Promise.all([
    supabase
      .from('players')
      .select('id', { count: 'exact', head: true })
      .eq('division_id', divisionId)
      .eq('active', true)
      .neq('inactivo', true),
    supabase
      .from('training_sessions')
      .select('id')
      .eq('division_id', divisionId)
      .gte('session_date', daysAgoISO(30)),
  ])

  let came30d = 0
  if (recentResult.data && recentResult.data.length > 0) {
    const sessionIds = recentResult.data.map((s: { id: string }) => s.id)
    const { data: records } = await supabase
      .from('attendance_records')
      .select('player_id')
      .in('session_id', sessionIds)
      .eq('present', true)
    const unique = new Set((records ?? []).map((r: { player_id: string }) => r.player_id))
    came30d = unique.size
  }

  return { totalActive: totalActive ?? 0, came30d }
}

// ── Admin stats ─────────────────────────────────────────────

export type DivisionStat = {
  id: string
  name: string
  sort_order: number
  totalActive: number
  came30d: number
}

export async function getAdminDivisionStats(): Promise<DivisionStat[]> {
  const supabase = await createClient()

  const { data: divisions } = await supabase
    .from('divisions')
    .select('id, name, sort_order')
    .not('name', 'in', `(${JUVENILE_NAMES.map(n => `"${n}"`).join(',')})`)
    .order('sort_order')

  if (!divisions || divisions.length === 0) return []

  const divisionIds = divisions.map((d: { id: string }) => d.id)

  const [playersRes, recentSessionsRes] = await Promise.all([
    supabase
      .from('players')
      .select('division_id')
      .eq('active', true)
      .neq('inactivo', true)
      .in('division_id', divisionIds),
    supabase
      .from('training_sessions')
      .select('id, division_id')
      .in('division_id', divisionIds)
      .gte('session_date', daysAgoISO(30)),
  ])

  // Players per division
  const playersByDiv: Record<string, number> = {}
  for (const d of divisions) playersByDiv[d.id] = 0
  for (const p of playersRes.data ?? []) {
    if (playersByDiv[p.division_id] !== undefined) playersByDiv[p.division_id]++
  }

  // Players who came in 30d
  const came30dByDiv: Record<string, Set<string>> = {}
  for (const d of divisions) came30dByDiv[d.id] = new Set()

  const recentSessions = recentSessionsRes.data ?? []
  if (recentSessions.length > 0) {
    const sessionIds = recentSessions.map((s: { id: string }) => s.id)
    const sessionDivMap: Record<string, string> = {}
    for (const s of recentSessions) sessionDivMap[s.id] = s.division_id

    const { data: records } = await supabase
      .from('attendance_records')
      .select('session_id, player_id')
      .in('session_id', sessionIds)
      .eq('present', true)

    for (const r of records ?? []) {
      const divId = sessionDivMap[r.session_id]
      if (divId && came30dByDiv[divId]) came30dByDiv[divId].add(r.player_id)
    }
  }

  return divisions.map((d: { id: string; name: string; sort_order: number }) => ({
    id: d.id,
    name: d.name,
    sort_order: d.sort_order,
    totalActive: playersByDiv[d.id] ?? 0,
    came30d: came30dByDiv[d.id]?.size ?? 0,
  }))
}

// ── Admin trend ─────────────────────────────────────────────

export const DIVISION_COLORS = [
  '#059669', // M6 emerald
  '#3b82f6', // M7 blue
  '#8b5cf6', // M8 violet
  '#f59e0b', // M9 amber
  '#ef4444', // M10 red
  '#06b6d4', // M11 cyan
  '#84cc16', // M12 lime
  '#f97316', // M13 orange
  '#ec4899', // M14 pink
]

export type AdminTrendData = {
  dates: string[]
  divisions: { id: string; name: string; color: string }[]
  data: { date: string; [divisionName: string]: string | number }[]
  totalByDate: number[]
}

export async function getAdminTrendData(limit = 20): Promise<AdminTrendData> {
  const supabase = await createClient()

  const { data: divisions } = await supabase
    .from('divisions')
    .select('id, name, sort_order')
    .not('name', 'in', `(${JUVENILE_NAMES.map(n => `"${n}"`).join(',')})`)
    .order('sort_order')

  if (!divisions || divisions.length === 0) {
    return { dates: [], divisions: [], data: [], totalByDate: [] }
  }

  const divisionIds = divisions.map((d: { id: string }) => d.id)

  const { data: sessions } = await supabase
    .from('training_sessions')
    .select('id, session_date, division_id')
    .in('division_id', divisionIds)
    .order('session_date', { ascending: false })

  // Unique dates (last N)
  const dateSet = new Set<string>()
  const dates: string[] = []
  for (const s of sessions ?? []) {
    if (!dateSet.has(s.session_date)) {
      dateSet.add(s.session_date)
      dates.push(s.session_date)
      if (dates.length >= limit) break
    }
  }
  dates.reverse() // chronological

  if (dates.length === 0) return { dates: [], divisions: [], data: [], totalByDate: [] }

  const relevantSessions = (sessions ?? []).filter((s: { session_date: string }) => dateSet.has(s.session_date))
  const sessionIds = relevantSessions.map((s: { id: string }) => s.id)
  const sessionMap: Record<string, { division_id: string; date: string }> = {}
  for (const s of relevantSessions) sessionMap[s.id] = { division_id: s.division_id, date: s.session_date }

  const { data: records } = await supabase
    .from('attendance_records')
    .select('session_id, present')
    .in('session_id', sessionIds)
    .eq('present', true)

  // Build count map: date → divisionId → count
  const countMap: Record<string, Record<string, number>> = {}
  for (const date of dates) {
    countMap[date] = {}
    for (const d of divisions) countMap[date][d.id] = 0
  }
  for (const r of records ?? []) {
    const sess = sessionMap[r.session_id]
    if (sess && countMap[sess.date]) countMap[sess.date][sess.division_id] = (countMap[sess.date][sess.division_id] ?? 0) + 1
  }

  const divisionsMeta = divisions.map((d: { id: string; name: string }, i: number) => ({
    id: d.id,
    name: d.name,
    color: DIVISION_COLORS[i % DIVISION_COLORS.length],
  }))

  const chartData = dates.map(date => {
    const row: { date: string; [key: string]: string | number } = { date }
    for (const d of divisions) row[d.name] = countMap[date][d.id] ?? 0
    return row
  })

  const totalByDate = dates.map(date =>
    divisions.reduce((sum: number, d: { id: string }) => sum + (countMap[date][d.id] ?? 0), 0)
  )

  return { dates, divisions: divisionsMeta, data: chartData, totalByDate }
}

