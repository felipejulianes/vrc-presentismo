import { redirect } from 'next/navigation'
import { getDivisionsForUser } from '@/lib/queries/players'
import { AttendanceSelector } from './AttendanceSelector'

export default async function AttendancePage() {
  const divisions = await getDivisionsForUser()

  // Entrenador con una sola división → ir directo sin selector
  if (divisions.length === 1) {
    redirect(`/attendance/${divisions[0].id}`)
  }

  return <AttendanceSelector divisions={divisions} />
}
