import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function AdminPage() {
  const supabase = await createClient()

  const [
    { count: playerCount },
    { count: coachCount },
    { count: sessionCount },
    { data: divisionStats },
  ] = await Promise.all([
    supabase.from('players').select('*', { count: 'exact', head: true }).eq('active', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'coach'),
    supabase.from('training_sessions').select('*', { count: 'exact', head: true })
      .gte('session_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
    supabase.from('divisions')
      .select('id, name, players(count)')
      .eq('is_juvenile', false)
      .order('sort_order'),
  ])

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Panel Admin</h1>
        <p className="text-sm text-gray-500">Virreyes Rugby Club</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-700">{playerCount ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Jugadores</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-700">{coachCount ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Entrenadores</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-700">{sessionCount ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Sesiones este mes</p>
        </div>
      </div>

      {/* Coordinación */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Coordinación</h2>
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          <Link href="/admin/sabados" className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 active:bg-gray-100">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚽</span>
              <div>
                <p className="text-sm font-medium text-gray-900">Fixture</p>
                <p className="text-xs text-gray-400">Partidos, entrenamiento y bondis por sábado</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Link href="/admin/tercer-tiempo" className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 active:bg-gray-100">
            <div className="flex items-center gap-3">
              <span className="text-xl">🥩</span>
              <div>
                <p className="text-sm font-medium text-gray-900">Tercer tiempo</p>
                <p className="text-xs text-gray-400">Cantidades por división, horario y clubes visitantes</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Link href="/admin/hoy" className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 active:bg-gray-100">
            <div className="flex items-center gap-3">
              <span className="text-xl">📋</span>
              <div>
                <p className="text-sm font-medium text-gray-900">Vista del día</p>
                <p className="text-xs text-gray-400">Asistencia de hoy en todas las divisiones</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Gestión */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Gestión</h2>
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          <Link href="/admin/coaches" className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 active:bg-gray-100">
            <div className="flex items-center gap-3">
              <span className="text-xl">👤</span>
              <div>
                <p className="text-sm font-medium text-gray-900">Entrenadores y admins</p>
                <p className="text-xs text-gray-400">Crear usuarios y asignar divisiones</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Link href="/admin/schools" className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 active:bg-gray-100">
            <div className="flex items-center gap-3">
              <span className="text-xl">🏫</span>
              <div>
                <p className="text-sm font-medium text-gray-900">Colegios</p>
                <p className="text-xs text-gray-400">Gestionar lista y aliases de colegios</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Link href="/admin/clubs" className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 active:bg-gray-100">
            <div className="flex items-center gap-3">
              <span className="text-xl">🏟️</span>
              <div>
                <p className="text-sm font-medium text-gray-900">Clubes rivales</p>
                <p className="text-xs text-gray-400">Gestionar la lista de clubes</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Link href="/admin/buses" className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 active:bg-gray-100">
            <div className="flex items-center gap-3">
              <span className="text-xl">🚌</span>
              <div>
                <p className="text-sm font-medium text-gray-900">Bondis</p>
                <p className="text-xs text-gray-400">Catálogo de vehículos y choferes</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Link href="/admin/progression" className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 active:bg-gray-100">
            <div className="flex items-center gap-3">
              <span className="text-xl">🏆</span>
              <div>
                <p className="text-sm font-medium text-gray-900">Avance de categoría</p>
                <p className="text-xs text-gray-400">Pasar jugadores a la siguiente división</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Jugadores por división */}
      {divisionStats && divisionStats.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Jugadores activos por división</h2>
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {divisionStats.map((div: { id: string; name: string; players: { count: number }[] }) => {
              const count = Array.isArray(div.players) ? div.players[0]?.count ?? 0 : 0
              return (
                <div key={div.id} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm font-medium text-gray-800">{div.name}</span>
                  <span className={`text-sm font-bold ${count > 0 ? 'text-green-700' : 'text-gray-300'}`}>
                    {count}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
