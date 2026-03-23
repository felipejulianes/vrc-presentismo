import { getDivisionsForUser } from '@/lib/queries/players'
import { AttendanceSelector } from './AttendanceSelector'

export default async function AttendancePage() {
  const divisions = await getDivisionsForUser()

  return <AttendanceSelector divisions={divisions} />
}
