import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function CoachesPage() {
  const supabase = await createClient()

  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, role, coach_divisions(division_id, divisions(name))')
    .in('role', ['coach', 'admin', 'tutora'])
    .order('full_name')

  const coaches = users?.filter(u => u.role !== 'tutora') ?? []
  const tutoras = users?.filter(u => u.role === 'tutora') ?? []

  const roleBadge = (role: string) => {
    if (role === 'admin') return <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-purple-100 text-purple-700">Admin</span>
    if (role === 'tutora') return <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-orange-100 text-orange-700">Tutora</span>
    return <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-gray-100 text-gray-600">Entrenador</span>
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const UserRow = ({ user }: { user: any }) => {
    const divisionNames = (user.coach_divisions ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((cd: any) => Array.isArray(cd.divisions) ? cd.divisions[0]?.name : cd.divisions?.name)
      .filter(Boolean)
      .sort()
      .join(', ') || (user.role === 'tutora' ? 'Todas las divisiones' : '—')

    return (
      <Link
        href={`/admin/coaches/${user.id}`}
        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100"
      >
        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">
          {user.full_name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
            {roleBadge(user.role)}
          </div>
          <p className="text-xs text-gray-400 truncate">{divisionNames}</p>
        </div>
        <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    )
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500">{users?.length ?? 0} usuarios en total</p>
        </div>
        <Link
          href="/admin/coaches/new"
          className="w-10 h-10 bg-green-700 hover:bg-green-800 text-white rounded-full flex items-center justify-center text-2xl leading-none transition-colors"
          aria-label="Crear usuario"
        >
          +
        </Link>
      </div>

      {/* Entrenadores y Admins */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Entrenadores y Admins
        </h2>
        {!coaches.length ? (
          <p className="text-sm text-gray-400 py-4 text-center">No hay entrenadores.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {coaches.map((coach: any) => <UserRow key={coach.id} user={coach} />)}
          </div>
        )}
      </div>

      {/* Tutoras */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Tutoras
        </h2>
        {!tutoras.length ? (
          <p className="text-sm text-gray-400 py-4 text-center">No hay tutoras todavía.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {tutoras.map((t: any) => <UserRow key={t.id} user={t} />)}
          </div>
        )}
      </div>
    </div>
  )
}
