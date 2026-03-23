import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPlayersByDivision } from '@/lib/queries/players'
import { getSessionWithAttendance } from '@/lib/queries/attendance'
import { AttendanceGrid } from '@/components/attendance/AttendanceGrid'

interface PageProps {
  params: { divisionId: string }
  searchParams: { date?: string }
}

function todayDate() {
  return new Date().toISOString().split('T')[0]
}

export default async function NewAttendancePage({ params, searchParams }: PageProps) {
  const date = searchParams.date ?? todayDate()
  const { divisionId } = params

  const supabase = await createClient()
  const { data: division } = await supabase
    .from('divisions')
    .select('id, name')
    .eq('id', divisionId)
    .single()

  if (!division) notFound()

  const [players, { attendance }] = await Promise.all([
    getPlayersByDivision(divisionId),
    getSessionWithAttendance(divisionId, date),
  ])

  const initialAttendance = { ...attendance }
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
      date={date}
      initialAttendance={initialAttendance}
      showDatePicker
      backUrl={`/attendance/${divisionId}`}
    />
  )
}
