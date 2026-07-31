import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPlayersByDivision } from '@/lib/queries/players'
import { getSessionWithAttendance } from '@/lib/queries/attendance'
import { AttendanceGrid } from '@/components/attendance/AttendanceGrid'
import { birthdayLabelForDate } from '@/lib/utils/birthdays'

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

  const refDate = new Date(date + 'T12:00:00')
  const birthdays: Record<string, string> = {}
  for (const p of players) {
    const label = birthdayLabelForDate(p.birth_date, refDate)
    if (label) birthdays[p.id] = label
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
      birthdays={birthdays}
    />
  )
}
