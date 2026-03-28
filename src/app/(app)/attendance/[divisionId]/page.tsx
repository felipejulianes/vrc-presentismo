import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MapsLink } from '@/components/attendance/MapsLink'
import { createClient } from '@/lib/supabase/server'
import { getSessionsForDivision } from '@/lib/queries/attendance'
import { getActivitiesForDivision } from '@/lib/queries/sabados'
import type { DivisionActivity } from '@/lib/queries/sabados'

interface PageProps {
  params: { divisionId: string }
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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

type ActivityInfo = {
  label: string
  mapsUrl?: string | null
  venueLabel?: string | null
  venueAddress?: string | null
}

function buildActivityInfo(act: DivisionActivity): ActivityInfo {
  if (act.activity_type === 'entrenamiento') {
    return { label: '🏃 Entrenamiento' }
  }
  const extraCount = (act.opponent_club_ids?.length ?? 0) - 1
  const vsText = act.opponent_club_name
    ? `vs ${act.opponent_club_name}${extraCount > 0 ? ` +${extraCount}` : ''}`
    : ''
  const venueText = act.venue === 'local' ? '· Local' : act.venue === 'visitante' ? '· Visitante' : ''
  const label = ['⚽ Partido', vsText, venueText].filter(Boolean).join(' ')

  // Venue info for partido visitante
  const venueLabel = act.venue === 'visitante'
    ? (act.location_venue_name ?? act.location_club_name ?? null)
    : act.venue === 'local' ? 'VRC' : null
  const mapsUrl = act.venue === 'visitante'
    ? (act.location_venue_maps_url ?? (act.location_club_name ? `https://maps.google.com/?q=${encodeURIComponent(act.location_club_name)}` : null))
    : null

  return { label, mapsUrl, venueLabel, venueAddress: act.location_venue_address }
}

export default async function AttendanceDivisionPage({ params }: PageProps) {
  const { divisionId } = params
  const today = toISO(new Date())

  const supabase = await createClient()
  const { data: division } = await supabase
    .from('divisions')
    .select('id, name')
    .eq('id', divisionId)
    .single()

  if (!division) notFound()

  const [sessions, activities] = await Promise.all([
    getSessionsForDivision(divisionId),
    getActivitiesForDivision(divisionId),
  ])

  // Build activity map keyed by date
  const activityByDate: Record<string, ActivityInfo> = {}
  for (const act of activities) {
    activityByDate[act.activity_date] = buildActivityInfo(act)
  }

  // Sort descending (nearest first — upcoming at top, past below)
  const sorted = [...sessions].sort((a, b) =>
    a.session_date < b.session_date ? 1 : a.session_date > b.session_date ? -1 : 0
  )

  // Separate upcoming/today from past
  const upcoming = sorted.filter(s => s.session_date >= today)
  const past = sorted.filter(s => s.session_date < today)

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
        <div className="flex items-center gap-2">
          {sessions.length > 0 && (
            <Link
              href={`/attendance/${divisionId}/tabla`}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 4v16M6 4v16M18 4v16" />
              </svg>
              Tabla
            </Link>
          )}
          <Link
            href={`/attendance/${divisionId}/new`}
            className="flex items-center gap-1.5 px-3 py-2 bg-green-700 text-white rounded-xl text-sm font-semibold"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva
          </Link>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-4 text-gray-400">
          <p className="text-lg mb-1">No hay sesiones todavía</p>
          <p className="text-sm">Tocá &quot;Nueva&quot; para crear la primera, o esperá que coordinación configure el evento.</p>
        </div>
      ) : (
        <div className="px-4 pb-4 space-y-2">
          {/* Upcoming / Today */}
          {upcoming.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-1">Próximas</p>
              {upcoming.map(session => (
                <SessionCard
                  key={session.id}
                  session={session}
                  divisionId={divisionId}
                  activityInfo={activityByDate[session.session_date]}
                  today={today}
                />
              ))}
            </>
          )}

          {/* Past */}
          {past.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2">Anteriores</p>
              {past.map(session => (
                <SessionCard
                  key={session.id}
                  session={session}
                  divisionId={divisionId}
                  activityInfo={activityByDate[session.session_date]}
                  today={today}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function SessionCard({
  session,
  divisionId,
  activityInfo,
  today,
}: {
  session: { id: string; session_date: string; present_count: number; total_count: number }
  divisionId: string
  activityInfo?: ActivityInfo
  today: string
}) {
  const isToday = session.session_date === today
  const isUpcoming = session.session_date > today

  return (
    <Link
      href={`/attendance/${divisionId}/${session.id}`}
      className={`flex items-center gap-4 bg-white border rounded-xl px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors ${
        isToday ? 'border-green-400 ring-1 ring-green-300' : 'border-gray-200'
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold capitalize ${isUpcoming ? 'text-gray-900' : 'text-gray-600'}`}>
          {formatDate(session.session_date)}
          {isToday && <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Hoy</span>}
        </p>
        {activityInfo ? (
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-blue-600 font-medium truncate">{activityInfo.label}</p>
            {activityInfo.mapsUrl && (
              <MapsLink
                href={activityInfo.mapsUrl}
                title={activityInfo.venueLabel ?? 'Ver en Maps'}
              />
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400">{session.session_date}</p>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        {session.total_count > 0 ? (
          <>
            <span className="text-lg font-bold text-green-700">{session.present_count}</span>
            <span className="text-sm text-gray-400"> / {session.total_count}</span>
            <p className="text-xs text-gray-400">presentes</p>
          </>
        ) : (
          <span className="text-xs text-gray-300">Sin lista</span>
        )}
      </div>
      <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}
