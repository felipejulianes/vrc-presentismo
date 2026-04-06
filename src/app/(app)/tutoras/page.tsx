import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getDocsStatusForUser, ALL_DOC_TYPES } from '@/lib/queries/docs'
import { getAllVisits } from '@/lib/queries/schoolVisits'

export default async function TutorasDashboard() {
  const supabase = await createClient()

  const [docs, visits, { count: totalPlayers }, { count: withSchool }] = await Promise.all([
    getDocsStatusForUser(),
    getAllVisits(),
    supabase.from('players').select('*', { count: 'exact', head: true }).eq('active', true).eq('inactivo', false),
    supabase.from('players').select('*', { count: 'exact', head: true }).eq('active', true).eq('inactivo', false).not('school_id', 'is', null),
  ])

  const totalDocs = docs.length * ALL_DOC_TYPES.length
  const receivedDocs = docs.reduce((acc, p) => acc + p.docs.length, 0)
  const completePlayers = docs.filter(p => p.docs.length === ALL_DOC_TYPES.length).length
  const incompletePlayers = docs.filter(p => p.docs.length < ALL_DOC_TYPES.length).length

  const upcomingVisits = visits.filter(v => v.status === 'planificada').slice(0, 5)
  const today = new Date().toISOString().split('T')[0]

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }

  const statusBadge = (status: string) => {
    if (status === 'planificada') return 'bg-blue-100 text-blue-700'
    if (status === 'realizada') return 'bg-green-100 text-green-700'
    return 'bg-gray-100 text-gray-500'
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Panel de Tutoras</h1>
        <p className="text-sm text-gray-500 mt-1">Resumen general</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Jugadores activos</p>
          <p className="text-2xl font-bold text-gray-900">{totalPlayers ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Con colegio asignado</p>
          <p className="text-2xl font-bold text-gray-900">{withSchool ?? 0}</p>
          <p className="text-xs text-gray-400">
            {totalPlayers ? Math.round(((withSchool ?? 0) / totalPlayers) * 100) : 0}%
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Docs completos</p>
          <p className="text-2xl font-bold text-green-700">{completePlayers}</p>
          <p className="text-xs text-gray-400">de {docs.length} jugadores</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Docs pendientes</p>
          <p className="text-2xl font-bold text-amber-600">{incompletePlayers}</p>
          <p className="text-xs text-gray-400">
            {totalDocs > 0 ? Math.round((receivedDocs / totalDocs) * 100) : 0}% recibidos
          </p>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/tutoras/docs"
          className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-5 hover:border-orange-300 hover:shadow-sm transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 group-hover:bg-orange-100 transition-colors flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Documentación</p>
            <p className="text-xs text-gray-500">{incompletePlayers} jugadores con docs incompletos</p>
          </div>
        </Link>

        <Link
          href="/tutoras/players"
          className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-5 hover:border-orange-300 hover:shadow-sm transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 group-hover:bg-orange-100 transition-colors flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Jugadores</p>
            <p className="text-xs text-gray-500">{totalPlayers ?? 0} jugadores activos</p>
          </div>
        </Link>

        <Link
          href="/tutoras/schools"
          className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-5 hover:border-orange-300 hover:shadow-sm transition-all group"
        >
          <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 group-hover:bg-orange-100 transition-colors flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Colegios</p>
            <p className="text-xs text-gray-500">{upcomingVisits.length} visitas planificadas</p>
          </div>
        </Link>
      </div>

      {/* Próximas visitas */}
      {upcomingVisits.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Próximas visitas</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {upcomingVisits.map(v => (
              <Link
                key={v.id}
                href={`/tutoras/schools/${v.school_id}`}
                className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{v.school_name}</p>
                  {v.notas && <p className="text-xs text-gray-400 truncate">{v.notas}</p>}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    v.visit_date < today ? 'bg-amber-100 text-amber-700' : statusBadge(v.status)
                  }`}>
                    {formatDate(v.visit_date)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
