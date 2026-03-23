import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPlayersByDivision } from '@/lib/queries/players'
import { getSessionById } from '@/lib/queries/attendance'
import { AttendanceGrid } from '@/components/attendance/AttendanceGrid'

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

  return (
    <AttendanceGrid
      players={players}
      divisionId={divisionId}
      divisionName={division.name}
      date={sessionData.date}
      initialAttendance={initialAttendance}
      backUrl={`/attendance/${divisionId}`}
    />
  )
}
