import { createClient } from '@/lib/supabase/server'

export type OpponentClub = {
  id: string
  name: string
  active: boolean
}

export type EventBus = {
  id: string
  event_date: string
  label: string
  driver_phone: string | null
}

export type DivisionActivity = {
  id: string
  activity_date: string
  division_id: string
  activity_type: 'partido' | 'entrenamiento'
  venue: 'local' | 'visitante' | null
  opponent_club_id: string | null
  opponent_club_name: string | null
  location_club_id: string | null
  location_club_name: string | null
  location_notes: string | null
  bus_id: string | null
  bus_label: string | null
  bus_driver_phone: string | null
}

export type TercerTiempoReport = {
  id: string
  activity_date: string
  division_id: string
  local_kids_count: number | null
  local_coaches_count: number | null
  notes: string | null
}

export type TercerTiempoVisitor = {
  id: string
  activity_date: string
  division_id: string
  club_id: string | null
  club_name: string | null
  kids_count: number | null
  coaches_count: number | null
}

export async function getOpponentClubs(): Promise<OpponentClub[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('opponent_clubs')
    .select('id, name, active')
    .eq('active', true)
    .order('name')
  return data ?? []
}

export async function getAllOpponentClubs(): Promise<OpponentClub[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('opponent_clubs')
    .select('id, name, active')
    .order('name')
  return data ?? []
}

export async function getActivitiesForDate(date: string): Promise<DivisionActivity[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('division_activities')
    .select(`
      id, activity_date, division_id, activity_type, venue,
      opponent_club_id, location_club_id, location_notes, bus_id,
      opponent_clubs:opponent_club_id(name),
      location_club:location_club_id(name),
      event_buses(label, driver_phone)
    `)
    .eq('activity_date', date)

  const pickName = (v: unknown): string | null => {
    if (!v) return null
    if (Array.isArray(v)) return (v[0] as Record<string, string>)?.name ?? null
    return (v as Record<string, string>)?.name ?? null
  }

  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    activity_date: r.activity_date as string,
    division_id: r.division_id as string,
    activity_type: r.activity_type as 'partido' | 'entrenamiento',
    venue: r.venue as 'local' | 'visitante' | null,
    opponent_club_id: r.opponent_club_id as string | null,
    opponent_club_name: pickName(r.opponent_clubs),
    location_club_id: r.location_club_id as string | null,
    location_club_name: pickName(r.location_club),
    location_notes: r.location_notes as string | null,
    bus_id: r.bus_id as string | null,
    bus_label: pickName(r.event_buses) ?? (Array.isArray(r.event_buses) ? r.event_buses[0]?.label : (r.event_buses as Record<string,string>)?.label) ?? null,
    bus_driver_phone: Array.isArray(r.event_buses)
      ? (r.event_buses[0]?.driver_phone ?? null)
      : ((r.event_buses as Record<string, string> | null)?.driver_phone ?? null),
  }))
}

export async function getActivityForDivisionDate(
  divisionId: string,
  date: string
): Promise<DivisionActivity | null> {
  const activities = await getActivitiesForDate(date)
  return activities.find(a => a.division_id === divisionId) ?? null
}

export async function getBusesForDate(date: string): Promise<EventBus[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('event_buses')
    .select('id, event_date, label, driver_phone')
    .eq('event_date', date)
    .order('label')
  return data ?? []
}

export async function getTercerTiempoForDate(date: string): Promise<TercerTiempoReport[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('tercer_tiempo_reports')
    .select('id, activity_date, division_id, local_kids_count, local_coaches_count, notes')
    .eq('activity_date', date)

  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    activity_date: r.activity_date as string,
    division_id: r.division_id as string,
    local_kids_count: r.local_kids_count as number | null,
    local_coaches_count: r.local_coaches_count as number | null,
    notes: r.notes as string | null,
  }))
}

export async function getTercerTiempoForDivisionDate(
  divisionId: string,
  date: string
): Promise<TercerTiempoReport | null> {
  const reports = await getTercerTiempoForDate(date)
  return reports.find(r => r.division_id === divisionId) ?? null
}

export async function getTercerTiempoVisitorsForDate(date: string): Promise<TercerTiempoVisitor[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('tercer_tiempo_visitors')
    .select('id, activity_date, division_id, club_id, kids_count, coaches_count, opponent_clubs(name)')
    .eq('activity_date', date)

  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    activity_date: r.activity_date as string,
    division_id: r.division_id as string,
    club_id: r.club_id as string | null,
    club_name: Array.isArray(r.opponent_clubs)
      ? (r.opponent_clubs[0]?.name ?? null)
      : ((r.opponent_clubs as Record<string, string> | null)?.name ?? null),
    kids_count: r.kids_count as number | null,
    coaches_count: r.coaches_count as number | null,
  }))
}

export async function getTercerTiempoVisitorsForDivisionDate(
  divisionId: string,
  date: string
): Promise<TercerTiempoVisitor[]> {
  const visitors = await getTercerTiempoVisitorsForDate(date)
  return visitors.filter(v => v.division_id === divisionId)
}

// Returns last N configured event dates (dates with at least one division_activity)
export async function getConfiguredEventDates(limit = 12): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('division_activities')
    .select('activity_date')
    .order('activity_date', { ascending: false })
    .limit(limit * 20) // overfetch to deduplicate

  if (!data) return []
  const seen = new Set<string>()
  const unique: string[] = []
  for (const r of data) {
    const d = r.activity_date as string
    if (!seen.has(d)) { seen.add(d); unique.push(d) }
  }
  return unique.slice(0, limit)
}
