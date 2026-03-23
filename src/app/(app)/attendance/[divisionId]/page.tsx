import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSessionsForDivision } from '@/lib/queries/attendance'

interface PageProps {
  params: { divisionId: string }
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export default async function AttendanceDivisionPage({ params }: PageProps) {
  const { divisionId } = params

  const supabase = await createClient()
  const { data: division } = await supabase
    .from('divisions')
    .select('id, name')
    .eq('id', divisionId)
    .single()

  if (!division) notFound()

  const sessions = await getSessionsForDivision(divisionId)

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-2">
        <Link href="/attendance" className="p-1 text-gray-500">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{division.name}</h1>
          <p className="text-sm text-gray-500">Asistencia a entrenamientos</p>
        </div>
        {/* Botón nueva lista */}
        <Link
          href={`/attendance/${divisionId}/new`}
          className="flex items-center gap-1.5 px-3 py-2 bg-green-700 text-white rounded-xl text-sm font-semibold"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tomar Asistencia
        </Link>
      </div>

      {/* Lista de sesiones */}
      {sessions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-4 text-gray-400">
          <p className="text-lg mb-1">No hay listas todavía</p>
          <p className="text-sm">Tocá &quot;Nueva lista&quot; para tomar la primera</p>
        </div>
      ) : (
        <div className="px-4 pb-4 space-y-2">
          {sessions.map(session => (
            <Link
              key={session.id}
              href={`/attendance/${divisionId}/${session.id}`}
              className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 capitalize">
                  {formatDate(session.session_date)}
                </p>
                <p className="text-xs text-gray-400">{session.session_date}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-lg font-bold text-green-700">{session.present_count}</span>
                <span className="text-sm text-gray-400"> / {session.total_count}</span>
                <p className="text-xs text-gray-400">presentes</p>
              </div>
              <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
