import { createClient } from '@/lib/supabase/server'
import type { DocType } from '@/lib/docs/constants'

export type { DocType } from '@/lib/docs/constants'
export { DOC_LABELS, ALL_DOC_TYPES } from '@/lib/docs/constants'

export type PlayerDocStatus = {
  player_id: string
  first_name: string
  last_name: string
  sobrenombre: string | null
  photo_url: string | null
  division_id: string
  division_name: string
  parent_phone: string | null
  parent_name: string | null
  docs: DocType[]
}

export async function getDocsStatusForUser(): Promise<PlayerDocStatus[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  let playersQuery = supabase
    .from('players')
    .select('id, first_name, last_name, sobrenombre, photo_url, division_id, parent_phone, parent_name, divisions(name)')
    .eq('active', true)
    .eq('inactivo', false)
    .order('last_name')
    .order('first_name')

  if (!['admin', 'tutora'].includes(profile?.role)) {
    const { data: cd } = await supabase
      .from('coach_divisions')
      .select('division_id')
      .eq('coach_id', user.id)
    const ids = cd?.map((r: { division_id: string }) => r.division_id) ?? []
    if (ids.length === 0) return []
    playersQuery = playersQuery.in('division_id', ids)
  }

  const { data: players, error } = await playersQuery
  if (error || !players) return []

  if (players.length === 0) return []

  const playerIds = players.map((p: { id: string }) => p.id)
  const { data: docRecords } = await supabase
    .from('player_documents')
    .select('player_id, doc_type')
    .in('player_id', playerIds)

  const docsMap: Record<string, DocType[]> = {}
  for (const r of docRecords ?? []) {
    if (!docsMap[r.player_id]) docsMap[r.player_id] = []
    docsMap[r.player_id].push(r.doc_type as DocType)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return players.map((p: any) => ({
    player_id: p.id,
    first_name: p.first_name,
    last_name: p.last_name,
    sobrenombre: p.sobrenombre,
    photo_url: p.photo_url,
    division_id: p.division_id,
    division_name: (Array.isArray(p.divisions) ? p.divisions[0]?.name : p.divisions?.name) ?? '',
    parent_phone: p.parent_phone,
    parent_name: p.parent_name,
    docs: docsMap[p.id] ?? [],
  }))
}
