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

  let activityBanner: { label: string; sub: string; color: string; mapsUrl?: string | null; venueAddress?: string | null } | null = null
  if (activity) {
    if (activity.activity_type === 'partido') {
      const opponentNames = activity.opponent_club_ids.length > 0
        ? activity.opponent_club_ids.map(id => clubById[id]).filter(Boolean)
        : activity.opponent_club_name ? [activity.opponent_club_name] : []
      const vsText = opponentNames.length > 0 ? `vs ${opponentNames.join(', ')}` : ''
      const venueText = activity.venue === 'local' ? 'Local' : activity.venue === 'visitante' ? 'Visitante' : ''
      // Prefer venue data (new), fall back to club name (legacy)
      const whereLabel = activity.venue === 'local'
        ? 'VRC'
        : (activity.location_venue_name ?? activity.location_club_name ?? activity.location_notes)
      const mapsUrl = activity.venue === 'visitante'
        ? (activity.location_venue_maps_url ?? (activity.location_club_name ? `https://maps.google.com/?q=${encodeURIComponent(activity.location_club_name)}` : null))
        : null
      activityBanner = {
        label: `⚽ Partido${vsText ? ' — ' + vsText : ''}${venueText ? ' · ' + venueText : ''}`,
        sub: whereLabel ? `Sede: ${whereLabel}` : '',
        color: 'bg-blue-50 border-blue-200 text-blue-800',
        mapsUrl,
        venueAddress: activity.location_venue_address,
      }
    } else {
      activityBanner = {
        label: '🏃 Entrenamiento',
        sub: activity.location_notes ?? '',
        color: 'bg-green-50 border-green-200 text-green-800',
      }
    }
    // Add bus info
    if (activity.bus_label) {
      const busLine = `${activity.bus_label}${activity.bus_driver_phone ? ' — Tel: ' + activity.bus_driver_phone : ''}`
      activityBanner.sub = [activityBanner.sub, busLine].filter(Boolean).join(' · ')
    }
  }

  return (
    <div>
      {/* Activity banner — shown above attendance grid */}
      {activityBanner && (
        <div className={`mx-4 mt-4 rounded-xl border px-4 py-2.5 ${activityBanner.color}`}>
          <p className="text-sm font-semibold">{activityBanner.label}</p>
          {activityBanner.sub && (
            activityBanner.mapsUrl ? (
              <div className="mt-1 flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs opacity-80">{activityBanner.sub}</p>
                  {activityBanner.venueAddress && (
                    <p className="text-xs opacity-60 mt-0.5">{activityBanner.venueAddress}</p>
                  )}
                </div>
                <a
                  href={activityBanner.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg"
                >
                  📍 Maps
                </a>
              </div>
            ) : (
              <p className="text-xs mt-0.5 opacity-80">{activityBanner.sub}</p>
            )
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
