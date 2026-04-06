import { getDocsStatusForUser, ALL_DOC_TYPES } from '@/lib/queries/docs'
import { TutorasDocsTable } from '@/components/tutoras/TutorasDocsTable'
import { createClient } from '@/lib/supabase/server'

export default async function TutorasDocsPage() {
  const supabase = await createClient()
  const [players, { data: divisions }] = await Promise.all([
    getDocsStatusForUser(),
    supabase.from('divisions').select('id, name, sort_order').eq('is_juvenile', false).order('sort_order'),
  ])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Documentación</h1>
        <p className="text-sm text-gray-500 mt-1">
          {players.length} jugadores · {players.filter(p => p.docs.length === ALL_DOC_TYPES.length).length} con todo completo
        </p>
      </div>

      <TutorasDocsTable players={players} divisions={divisions ?? []} />
    </div>
  )
}
