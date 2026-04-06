import { getSchoolsMatrix, getAllVisits } from '@/lib/queries/schoolVisits'
import { createClient } from '@/lib/supabase/server'
import { SchoolsMatrixView } from '@/components/tutoras/SchoolsMatrixView'

export default async function TutorasSchoolsPage() {
  const supabase = await createClient()

  const [matrix, visits, { data: divisions }, { data: schools }] = await Promise.all([
    getSchoolsMatrix(),
    getAllVisits(),
    supabase.from('divisions').select('id, name, sort_order').eq('is_juvenile', false).order('sort_order'),
    supabase.from('schools').select('id, name').eq('active', true).order('name'),
  ])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Colegios</h1>
        <p className="text-sm text-gray-500 mt-1">{matrix.length} colegios con jugadores registrados</p>
      </div>

      <SchoolsMatrixView
        matrix={matrix}
        visits={visits}
        divisions={divisions ?? []}
        allSchools={schools ?? []}
      />
    </div>
  )
}
