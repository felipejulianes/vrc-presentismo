import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDivisionsForUser } from '@/lib/queries/players'
import { DivisionAssigner } from '@/components/admin/DivisionAssigner'
import { DeleteCoachButton } from '@/components/admin/DeleteCoachButton'
import { RoleSelector } from '@/components/admin/RoleSelector'

interface PageProps {
  params: { coachId: string }
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  tutora: 'Tutora',
  coach: 'Entrenador',
}

export default async function EditCoachPage({ params }: PageProps) {
  const supabase = await createClient()
  const adminClient = createAdminClient()

  // Get current logged-in user (to detect self)
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  const [{ data: coach }, allDivisions, { data: assigned }, authUserRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role').eq('id', params.coachId).single(),
    getDivisionsForUser(),
    supabase.from('coach_divisions').select('division_id').eq('coach_id', params.coachId),
    adminClient.auth.admin.getUserById(params.coachId),
  ])

  if (!coach) notFound()

  const assignedIds = assigned?.map(r => r.division_id) ?? []
  const email = authUserRes.data.user?.email ?? '—'
  const isSelf = currentUser?.id === params.coachId

  const roleBadgeClass =
    coach.role === 'admin' ? 'bg-purple-100 text-purple-700' :
    coach.role === 'tutora' ? 'bg-orange-100 text-orange-700' :
    'bg-gray-100 text-gray-600'

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-gray-900">{coach.full_name}</h1>
        <span className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${roleBadgeClass}`}>
          {ROLE_LABELS[coach.role] ?? coach.role}
        </span>
        <p className="text-sm text-gray-500 pt-1">
          <span className="font-medium text-gray-600">Email:</span> {email}
        </p>
      </div>

      {/* Role selector */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Rol</h2>
        <RoleSelector
          coachId={coach.id}
          currentRole={coach.role as 'admin' | 'coach' | 'tutora'}
          isSelf={isSelf}
        />
      </div>

      {/* Division assigner */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Divisiones asignadas</h2>
        <p className="text-xs text-gray-400 mb-3">
          Solo aplica para entrenadores. Administradores y tutoras acceden a todas.
        </p>
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
