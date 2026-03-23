import { getDivisionsForUser } from '@/lib/queries/players'
import { StatsDivisionSelector } from './StatsDivisionSelector'

export default async function StatsPage() {
  const divisions = await getDivisionsForUser()

  return (
    <div>
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900">Estadísticas</h1>
        <p className="text-sm text-gray-500">Elegí una división para ver la asistencia</p>
      </div>
      <StatsDivisionSelector divisions={divisions} />
    </div>
  )
}
