import { createClient } from '@/lib/supabase/server'
import type { PlayerInterview } from '@/types'

export type AllInterviewRow = PlayerInterview & {
  player_first_name: string
  player_last_name: string
}

export async function getAllInterviewsForTutoras(): Promise<AllInterviewRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('player_interviews')
    .select('id, player_id, interview_date, interviewer_id, grado, colegio_snapshot, notas, created_at, profiles(full_name), players(first_name, last_name)')
    .order('interview_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    id: r.id,
    player_id: r.player_id,
    interview_date: r.interview_date,
    interviewer_id: r.interviewer_id,
    interviewer_name: (Array.isArray(r.profiles) ? r.profiles[0]?.full_name : r.profiles?.full_name) ?? null,
    grado: r.grado,
    colegio_snapshot: r.colegio_snapshot,
    notas: r.notas,
    created_at: r.created_at,
    player_first_name: (Array.isArray(r.players) ? r.players[0]?.first_name : r.players?.first_name) ?? '',
    player_last_name: (Array.isArray(r.players) ? r.players[0]?.last_name : r.players?.last_name) ?? '',
  }))
}

export async function getInterviewsForPlayer(playerId: string): Promise<PlayerInterview[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('player_interviews')
    .select('id, player_id, interview_date, interviewer_id, grado, colegio_snapshot, notas, created_at, profiles(full_name)')
    .eq('player_id', playerId)
    .order('interview_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    id: r.id,
    player_id: r.player_id,
    interview_date: r.interview_date,
    interviewer_id: r.interviewer_id,
    interviewer_name: (Array.isArray(r.profiles) ? r.profiles[0]?.full_name : r.profiles?.full_name) ?? null,
    grado: r.grado,
    colegio_snapshot: r.colegio_snapshot,
    notas: r.notas,
    created_at: r.created_at,
  }))
}
