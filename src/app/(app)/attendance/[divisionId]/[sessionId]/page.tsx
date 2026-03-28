import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPlayersByDivision } from '@/lib/queries/players'
import { getSessionById } from '@/lib/queries/attendance'
import {
  getActivityForDivisionDate,
  getTercerTiempoForDivisionDate,
  getTercerTiempoVisitorsForDivisionDate,
  getOpponentClubs,
} from '@/lib/queries/sabados'
import { AttendanceGrid } from '@/components/attendance/AttendanceGrid'
import { TercerTiempoCard } from '@/components/attendance/TercerTiempoCard'
import { formatWhatsAppNumber } from '@/lib/utils/whatsapp'

interface PageProps {
  params: { divisionId: string; sessionId: string }
}

export default async function SessionPage({ params }: PageProps) {
  const { divisionId, sessionId } = params

  const supabase = await createClient()
  const { data: division } = await supabase
    .from('divisions')
    .select('id, name')
    .eq('id', divisionId)
    .single()

  if (!division) notFound()

  const [players, sessionData] = await Promise.all([
    getPlayersByDivision(divisionId),
    getSessionById(sessionId),
  ])

  if (!sessionData) notFound()

  const initialAttendance = { ...sessionData.attendance }
  for (const p of players) {
    if (!(p.id in initialAttendance)) initialAttendance[p.id] = false
  }

  const attendanceCount = Object.values(initialAttendance).filter(Boolean).length

  const [activity, existingReport, existingVisitors, clubs] = await Promise.all([
    getActivityForDivisionDate(divisionId, sessionData.date).catch(() => null),
    getTercerTiempoForDivisionDate(divisionId, sessionData.date).catch(() => null),
    getTercerTiempoVisitorsForDivisionDate(divisionId, sessionData.date).catch(() => []),
    getOpponentClubs().catch(() => []),
  ])

  // Build activity banner text
  const clubById = Object.fromEntries(clubs.map(c => [c.id, c.name]))

  type ActivityBanner = {
    label: string
    sub: string
    color: string
    mapsUrl?: string | null
    venueAddress?: string | null
    coordinatorName?: string | null
    coordinatorPhone?: string | null
    busLabel?: string | null
    busPhone?: string | null
  }

  let activityBanner: ActivityBanner | null = null
  if (activity) {
    if (activity.activity_type === 'partido') {
      const opponentNames = activity.opponent_club_ids.length > 0
        ? activity.opponent_club_ids.map(id => clubById[id]).filter(Boolean)
        : activity.opponent_club_name ? [activity.opponent_club_name] : []
      const vsText = opponentNames.length > 0 ? `vs ${opponentNames.join(', ')}` : ''
      const venueText = activity.venue === 'local' ? 'Local' : activity.venue === 'visitante' ? 'Visitante' : ''
      const whereLabel = activity.venue === 'local'
        ? 'VRC'
        : (activity.location_venue_name ?? activity.location_club_name ?? activity.location_notes)
      const mapsUrl = activity.venue === 'visitante'
        ? (activity.location_venue_maps_url ?? (activity.location_club_name ? `https://maps.google.com/?q=${encodeURIComponent(activity.location_club_name)}` : null))
        : null

      // Coordinator of the venue club (for away games)
      const locationClub = activity.location_club_id ? clubs.find(c => c.id === activity.location_club_id) : null

      activityBanner = {
        label: `⚽ Partido${vsText ? ' — ' + vsText : ''}${venueText ? ' · ' + venueText : ''}`,
        sub: whereLabel ? `Sede: ${whereLabel}` : '',
        color: 'bg-blue-50 border-blue-200 text-blue-800',
        mapsUrl,
        venueAddress: activity.location_venue_address,
        coordinatorName: locationClub?.coordinator_name ?? null,
        coordinatorPhone: locationClub?.coordinator_phone ?? null,
      }
    } else {
      activityBanner = {
        label: '🏃 Entrenamiento',
        sub: activity.location_notes ?? '',
        color: 'bg-green-50 border-green-200 text-green-800',
      }
    }
    // Bus info
    if (activity.bus_label) {
      activityBanner.busLabel = activity.bus_label
      activityBanner.busPhone = activity.bus_driver_phone
    }
  }

  return (
    <div>
      {/* Activity banner — shown above attendance grid */}
      {activityBanner && (
        <div className={`mx-4 mt-4 rounded-xl border px-4 py-3 space-y-2 ${activityBanner.color}`}>
          {/* Título */}
          <p className="text-sm font-semibold">{activityBanner.label}</p>

          {/* Sede */}
          {activityBanner.sub && (
            <div>
              <p className="text-xs opacity-80">{activityBanner.sub}</p>
              {activityBanner.venueAddress && (
                <p className="text-xs opacity-60 mt-0.5">{activityBanner.venueAddress}</p>
              )}
            </div>
          )}

          {/* Botones de la sede (solo visitante) */}
          {(activityBanner.mapsUrl || activityBanner.coordinatorPhone) && (
            <div className="flex flex-wrap gap-2 pt-0.5">
              {activityBanner.mapsUrl && (
                <a
                  href={activityBanner.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl min-w-[72px] justify-center"
                >
                  📍 Maps
                </a>
              )}
              {activityBanner.coordinatorPhone && (
                <>
                  <a
                    href={`https://wa.me/${formatWhatsAppNumber(activityBanner.coordinatorPhone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded-xl min-w-[72px] justify-center"
                    title={activityBanner.coordinatorName ?? 'Coordinador'}
                  >
                    💬 WA
                  </a>
                  <a
                    href={`tel:${activityBanner.coordinatorPhone}`}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-600 text-white text-xs font-semibold rounded-xl min-w-[72px] justify-center"
                    title={activityBanner.coordinatorName ?? 'Coordinador'}
                  >
                    📞 Llamar
                  </a>
                </>
              )}
            </div>
          )}

          {/* Bondi */}
          {activityBanner.busLabel && (
            <div className="border-t border-current/20 pt-2 space-y-1.5">
              <p className="text-xs font-medium opacity-80">🚌 {activityBanner.busLabel}</p>
              {activityBanner.busPhone && (
                <div className="flex gap-2">
                  <a
                    href={`https://wa.me/${formatWhatsAppNumber(activityBanner.busPhone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded-xl min-w-[72px] justify-center"
                  >
                    💬 WA Chofer
                  </a>
                  <a
                    href={`tel:${activityBanner.busPhone}`}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-600 text-white text-xs font-semibold rounded-xl min-w-[72px] justify-center"
                  >
                    📞 Llamar
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <AttendanceGrid
        players={players}
        divisionId={divisionId}
        divisionName={division.name}
        date={sessionData.date}
        initialAttendance={initialAttendance}
        backUrl={`/attendance/${divisionId}`}
      />

      {/* Tercer tiempo — only for home games */}
      {activity && activity.venue === 'local' && (
        <TercerTiempoCard
          date={sessionData.date}
          divisionId={divisionId}
          divisionName={division.name}
          activity={activity}
          existingReport={existingReport}
          existingVisitors={existingVisitors}
          attendanceCount={attendanceCount}
          clubs={clubs}
        />
      )}
    </div>
  )
}
