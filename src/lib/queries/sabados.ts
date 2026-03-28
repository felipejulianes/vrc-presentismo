import { createClient } from '@/lib/supabase/server'

export type OpponentClub = {
  id: string
  name: string
  active: boolean
  coordinator_name: string | null
  coordinator_phone: string | null
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
  // Primary opponent (first in list) — kept for backwards-compat banner display
  opponent_club_id: string | null
  opponent_club_name: string | null
  // All opponents (multi-club support)
  opponent_club_ids: string[]
  location_club_id: string | null
  location_club_name: string | null
  location_notes: string | null
  // Sede específica (club_venues)
  location_venue_id: string | null
  location_venue_name: string | null
  location_venue_address: string | null
  location_venue_maps_url: string | null
  bus_id: string | null
  bus_label: string | null
  bus_driver_phone: string | null
}

export type TercerTiempoReport = {
  id: string
  activity_date: string
  division_id: string
  // Confirmed values — set by the coordinator
  local_kids_count: number | null
  local_coaches_count: number | null
  notes: string | null
  // Declared by coach from their attendance page
  coach_declared_kids: number | null
  coach_declared_coaches: number | null
  // Time communicated to coaches
  tercer_tiempo_time: string | null   // "HH:MM" format
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
    .select('id, name, active, coordinator_name, coordinator_phone')
    .eq('active', true)
    .order('name')
  return data ?? []
}

export async function getAllOpponentClubs(): Promise<OpponentClub[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('opponent_clubs')
    .select('id, name, active, coordinator_name, coordinator_phone')
    .order('name')
  return data ?? []
}

function mapActivity(r: Record<string, unknown>): DivisionActivity {
  const pickStr = (v: unknown, field: string): string | null => {
    if (!v) return null
    if (Array.isArray(v)) return (v[0] as Record<string, string>)?.[field] ?? null
    return (v as Record<string, string>)?.[field] ?? null
  }
  return {
    id: r.id as string,
    activity_date: r.activity_date as string,
    division_id: r.division_id as string,
    activity_type: r.activity_type as 'partido' | 'entrenamiento',
    venue: r.venue as 'local' | 'visitante' | null,
    opponent_club_id: r.opponent_club_id as string | null,
    opponent_club_name: pickStr(r.opponent_clubs, 'name'),
    opponent_club_ids: (r.opponent_club_ids as string[] | null) ?? [],
    location_club_id: r.location_club_id as string | null,
    location_club_name: pickStr(r.location_club, 'name'),
    location_notes: r.location_notes as string | null,
    location_venue_id: r.location_venue_id as string | null,
    location_venue_name: pickStr(r.location_venue, 'name'),
    location_venue_address: pickStr(r.location_venue, 'address'),
    location_venue_maps_url: pickStr(r.location_venue, 'maps_url'),
    bus_id: r.bus_id as string | null,
    bus_label: Array.isArray(r.event_buses) ? (r.event_buses[0]?.label ?? null) : ((r.event_buses as Record<string, string> | null)?.label ?? null),
    bus_driver_phone: Array.isArray(r.event_buses) ? (r.event_buses[0]?.driver_phone ?? null) : ((r.event_buses as Record<string, string> | null)?.driver_phone ?? null),
  }
}

const ACTIVITY_SELECT = `
  id, activity_date, division_id, activity_type, venue,
  opponent_club_id, opponent_club_ids, location_club_id, location_notes, bus_id,
  location_venue_id,
  opponent_clubs:opponent_club_id(name),
  location_club:location_club_id(name),
  location_venue:location_venue_id(name, address, maps_url),
  event_buses(label, driver_phone)
`

export async function getActivitiesForDate(date: string): Promise<DivisionActivity[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('division_activities')
    .select(ACTIVITY_SELECT)
    .eq('activity_date', date)
  return (data ?? []).map((r: Record<string, unknown>) => mapActivity(r))
}

export async function getActivitiesForDivision(divisionId: string): Promise<DivisionActivity[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('division_activities')
    .select(ACTIVITY_SELECT)
    .eq('division_id', divisionId)
  return (data ?? []).map((r: Record<string, unknown>) => mapActivity(r))
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
    .select('id, activity_date, division_id, local_kids_count, local_coaches_count, notes, coach_declared_kids, coach_declared_coaches, tercer_tiempo_time')
    .eq('activity_date', date)

  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    activity_date: r.activity_date as string,
    division_id: r.division_id as string,
    local_kids_count: r.local_kids_count as number | null,
    local_coaches_count: r.local_coaches_count as number | null,
    notes: r.notes as string | null,
    coach_declared_kids: r.coach_declared_kids as number | null,
    coach_declared_coaches: r.coach_declared_coaches as number | null,
    tercer_tiempo_time: r.tercer_tiempo_time as string | null,
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

export type ClubVenue = {
  id: string
  club_id: string
  name: string
  address: string | null
  maps_url: string | null
  is_default: boolean
}

export type OpponentClubFull = OpponentClub & {
  coordinator_name: string | null
  coordinator_phone: string | null
  coordinator_notes: string | null
  venues: ClubVenue[]
}

export async function getClubWithVenues(clubId: string): Promise<OpponentClubFull | null> {
  const supabase = await createClient()
  const { data: club } = await supabase
    .from('opponent_clubs')
    .select('id, name, active, coordinator_name, coordinator_phone, coordinator_notes')
    .eq('id', clubId)
    .single()
  if (!club) return null
  const { data: venues } = await supabase
    .from('club_venues')
    .select('id, club_id, name, address, maps_url, is_default')
    .eq('club_id', clubId)
    .order('is_default', { ascending: false })
  return { ...club, venues: venues ?? [] }
}

export async function getAllClubsFull(): Promise<OpponentClubFull[]> {
  const supabase = await createClient()
  const { data: clubs } = await supabase
    .from('opponent_clubs')
    .select('id, name, active, coordinator_name, coordinator_phone, coordinator_notes')
    .order('name')
  if (!clubs) return []
  const { data: venues } = await supabase
    .from('club_venues')
    .select('id, club_id, name, address, maps_url, is_default')
  const venuesByClub: Record<string, ClubVenue[]> = {}
  for (const v of venues ?? []) {
    if (!venuesByClub[v.club_id]) venuesByClub[v.club_id] = []
    venuesByClub[v.club_id].push(v)
  }
  return clubs.map(c => ({ ...c, venues: venuesByClub[c.id] ?? [] }))
}
