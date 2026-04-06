import { getSchoolsMatrix, getAllVisits } from '@/lib/queries/schoolVisits'
import { getSchoolsWithCount } from '@/lib/queries/schools'
import { createClient } from '@/lib/supabase/server'
import { SchoolsMatrixView } from '@/components/tutoras/SchoolsMatrixView'

export default async function TutorasSchoolsPage() {
  const supabase = await createClient()

  const [matrix, visits, { data: divisions }, schoolsWithCount] = await Promise.all([
    getSchoolsMatrix(),
    getAllVisits(),
    supabase.from('divisions').select('id, name, sort_order').eq('is_juvenile', false).order('sort_order'),
    getSchoolsWithCount(),
  ])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Colegios</h1>
        <p className="text-sm text-gray-500 mt-1">{matrix.length} colegios con jugadores activos</p>
      </div>

      <SchoolsMatrixView
        matrix={matrix}
        visits={visits}
        divisions={divisions ?? []}
        schoolsWithCount={schoolsWithCount}
      />
    </div>
  )
}
