import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDivisionsForUser } from '@/lib/queries/players'
import { DivisionAssigner } from '@/components/admin/DivisionAssigner'
import { DeleteCoachButton } from '@/components/admin/DeleteCoachButton'

interface PageProps {
  params: { coachId: string }
}

export default async function EditCoachPage({ params }: PageProps) {
  const supabase = await createClient()

  const [{ data: coach }, allDivisions, { data: assigned }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role').eq('id', params.coachId).single(),
    getDivisionsForUser(), // admin ve todas
    supabase.from('coach_divisions').select('division_id').eq('coach_id', params.coachId),
  ])

  if (!coach) notFound()

  const assignedIds = assigned?.map(r => r.division_id) ?? []

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{coach.full_name}</h1>
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
          coach.role === 'admin'
            ? 'bg-purple-100 text-purple-700'
            : 'bg-gray-100 text-gray-600'
        }`}>
          {coach.role === 'admin' ? 'Administrador' : 'Entrenador'}
        </span>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Divisiones asignadas</h2>
        <DivisionAssigner
          coachId={coach.id}
          allDivisions={allDivisions}
          assignedIds={assignedIds}
        />
      </div>

      <div className="pt-4 border-t border-gray-100">
        <DeleteCoachButton coachId={coach.id} coachName={coach.full_name} />
      </div>
    </div>
  )
}
