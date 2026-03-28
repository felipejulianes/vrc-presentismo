import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDivisionsForUser } from '@/lib/queries/players'
import { getAdminDivisionStats, getAdminTrendData } from '@/lib/queries/stats'
import { AdminStatsView } from '@/components/stats/AdminStatsView'
import { StatsDivisionSelector } from './StatsDivisionSelector'

export default async function StatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  // Admin → vista general de todas las divisiones
  if (profile?.role === 'admin') {
    const [divisionStats, trendData] = await Promise.all([
      getAdminDivisionStats(),
      getAdminTrendData(100),
    ])

    const totalActive = divisionStats.reduce((s, d) => s + d.totalActive, 0)
    const came30d = divisionStats.reduce((s, d) => s + d.came30d, 0)

    return (
      <AdminStatsView
        totalActive={totalActive}
        came30d={came30d}
        divisionStats={divisionStats}
        trendData={trendData}
      />
    )
  }

  // Coach → si tiene 1 división va directo, si tiene varias elige
  const divisions = await getDivisionsForUser()
  if (divisions.length === 1) redirect(`/stats/${divisions[0].id}`)

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
