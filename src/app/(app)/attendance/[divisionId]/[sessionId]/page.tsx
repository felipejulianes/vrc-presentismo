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
  let activityBanner: { label: string; sub: string; color: string } | null = null
  if (activity) {
    if (activity.activity_type === 'partido') {
      const parts: string[] = []
      if (activity.opponent_club_name) parts.push(`vs ${activity.opponent_club_name}`)
      if (activity.venue) parts.push(activity.venue === 'local' ? 'Local' : 'Visitante')
      const where = activity.venue === 'local' ? 'VRC' : activity.location_club_name ?? activity.location_notes
      activityBanner = {
        label: `⚽ Partido${parts.length ? ' — ' + parts.join(' · ') : ''}`,
        sub: where ? `Sede: ${where}` : '',
        color: 'bg-blue-50 border-blue-200 text-blue-800',
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
            <p className="text-xs mt-0.5 opacity-80">{activityBanner.sub}</p>
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
