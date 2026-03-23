import { createClient } from '@/lib/supabase/server'
import type { AttendanceState } from '@/types'

export type SessionSummary = {
  id: string
  session_date: string
  present_count: number
  total_count: number
}

export async function getSessionsForDivision(divisionId: string): Promise<SessionSummary[]> {
  const supabase = await createClient()

  const { data: sessions, error } = await supabase
    .from('training_sessions')
    .select('id, session_date')
    .eq('division_id', divisionId)
    .order('session_date', { ascending: false })

  if (error || !sessions) return []

  if (sessions.length === 0) return []

  const sessionIds = sessions.map(s => s.id)

  const { data: records } = await supabase
    .from('attendance_records')
    .select('session_id, present')
    .in('session_id', sessionIds)

  const countMap: Record<string, { present: number; total: number }> = {}
  for (const s of sessions) {
    countMap[s.id] = { present: 0, total: 0 }
  }
  for (const r of records ?? []) {
    if (countMap[r.session_id]) {
      countMap[r.session_id].total++
      if (r.present) countMap[r.session_id].present++
    }
  }

  return sessions.map(s => ({
    id: s.id,
    session_date: s.session_date,
    present_count: countMap[s.id]?.present ?? 0,
    total_count: countMap[s.id]?.total ?? 0,
  }))
}

export async function getSessionWithAttendance(
  divisionId: string,
  date: string
): Promise<{ sessionId: string | null; attendance: AttendanceState }> {
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('training_sessions')
    .select('id')
    .eq('division_id', divisionId)
    .eq('session_date', date)
    .single()

  if (!session) return { sessionId: null, attendance: {} }

  const { data: records } = await supabase
    .from('attendance_records')
    .select('player_id, present')
    .eq('session_id', session.id)

  const attendance: AttendanceState = {}
  for (const r of records ?? []) {
    attendance[r.player_id] = r.present
  }

  return { sessionId: session.id, attendance }
}

export async function getSessionById(
  sessionId: string
): Promise<{ sessionId: string; date: string; divisionId: string; attendance: AttendanceState } | null> {
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('training_sessions')
    .select('id, session_date, division_id')
    .eq('id', sessionId)
    .single()

  if (!session) return null

  const { data: records } = await supabase
    .from('attendance_records')
    .select('player_id, present')
    .eq('session_id', session.id)

  const attendance: AttendanceState = {}
  for (const r of records ?? []) {
    attendance[r.player_id] = r.present
  }

  return {
    sessionId: session.id,
    date: session.session_date,
    divisionId: session.division_id,
    attendance,
  }
}
