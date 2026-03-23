import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPlayersByDivision } from '@/lib/queries/players'
import { getSessionById } from '@/lib/queries/attendance'
import { getActivityForDivisionDate, getTercerTiempoForDivisionDate, getOpponentClubs } from '@/lib/queries/sabados'
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
    if (!(p.id in initialAttendance)) {
      initialAttendance[p.id] = false
    }
  }

  const attendanceCount = Object.values(initialAttendance).filter(Boolean).length

  // Fetch activity + tercer tiempo in parallel (non-blocking — ignore errors)
  const [activity, existingReport, clubs] = await Promise.all([
    getActivityForDivisionDate(divisionId, sessionData.date).catch(() => null),
    getTercerTiempoForDivisionDate(divisionId, sessionData.date).catch(() => null),
    getOpponentClubs().catch(() => []),
  ])

  return (
    <div>
      <AttendanceGrid
        players={players}
        divisionId={divisionId}
        divisionName={division.name}
        date={sessionData.date}
        initialAttendance={initialAttendance}
        backUrl={`/attendance/${divisionId}`}
      />

      {/* Tercer tiempo — only shown when coordination configured an activity for this date */}
      {activity && (
        <TercerTiempoCard
          date={sessionData.date}
          divisionId={divisionId}
          divisionName={division.name}
          activity={activity}
          existingReport={existingReport}
          attendanceCount={attendanceCount}
          clubs={clubs}
        />
      )}
    </div>
  )
}
