import { createClient } from '@/lib/supabase/server'

export type School = {
  id: string
  name: string
  aliases: string | null
  active: boolean
  address: string | null
  lat: number | null
  lng: number | null
  maps_url: string | null
}

export type SchoolWithCount = School & { player_count: number }

export async function getSchools(): Promise<School[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('schools')
    .select('id, name, aliases, active, address, lat, lng, maps_url')
    .eq('active', true)
    .order('name')
  return data ?? []
}

export async function getSchoolsWithCount(): Promise<SchoolWithCount[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('schools')
    .select('id, name, aliases, active, address, lat, lng, maps_url, players(count)')
    .order('name')
  return (data ?? []).map(s => ({
    id: s.id,
    name: s.name,
    aliases: s.aliases,
    active: s.active,
    address: s.address ?? null,
    lat: s.lat ?? null,
    lng: s.lng ?? null,
    maps_url: s.maps_url ?? null,
    player_count: Array.isArray(s.players) ? (s.players[0] as { count: number })?.count ?? 0 : 0,
  }))
}
