import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getConfiguredEventDates } from '@/lib/queries/sabados'
import { HoyDatePicker } from '@/components/admin/HoyDatePicker'

function getUpcomingSaturdays(count = 6): string[] {
  const dates: string[] = []
  const today = new Date()
  const dayOfWeek = today.getDay()
  const daysUntilSat = dayOfWeek === 6 ? 0 : (6 - dayOfWeek)
  const nextSat = new Date(today)
  nextSat.setDate(today.getDate() + daysUntilSat)
  for (let i = 0; i < count; i++) {
    const d = new Date(nextSat)
    d.setDate(nextSat.getDate() + 7 * i)
    dates.push(toISO(d))
  }
  return dates
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default async function SabadosPage() {
  const supabase = await createClient()
  const todayISO = toISO(new Date())

  const [configuredDates, { data: activityCounts }] = await Promise.all([
    getConfiguredEventDates(12),
    supabase
      .from('division_activities')
      .select('activity_date')
      .gte('activity_date', '2020-01-01'),
  ])

  // Count per date
  const countMap: Record<string, number> = {}
  for (const r of activityCounts ?? []) {
    countMap[r.activity_date] = (countMap[r.activity_date] ?? 0) + 1
  }

  const upcomingSaturdays = getUpcomingSaturdays(6)
  // Merge: upcoming + configured (not already in upcoming)
  const allDates = [
    ...upcomingSaturdays,
    ...configuredDates.filter(d => !upcomingSaturdays.includes(d)),
  ]
  const seen = new Set<string>()
  const uniqueSorted = allDates
    .filter(d => { if (seen.has(d)) return false; seen.add(d); return true })
    .sort()
    .reverse()

  return (
    <div className="pb-6">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2">
        <Link href="/admin" className="p-1 text-gray-500">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Actividades</h1>
          <p className="text-sm text-gray-500">Partidos y entrenamientos</p>
        </div>
      </div>

      {/* Ir a una fecha específica */}
      <div className="px-4 pb-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Ir a una fecha</p>
          <div className="flex gap-2 items-center">
            <HoyDatePicker value={todayISO} onChangePath="/admin/sabados" />
          </div>
        </div>
      </div>

      {/* Lista de fechas */}
      <div className="px-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Próximos y recientes</h2>
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {uniqueSorted.map(date => {
            const count = countMap[date] ?? 0
            const isToday = date === todayISO
            const isPast = date < todayISO

            return (
              <Link
                key={date}
                href={`/admin/sabados/${date}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100"
              >
                <div className="flex-1">
                  <p className={`text-sm font-semibold capitalize ${isPast && !isToday ? 'text-gray-500' : 'text-gray-900'}`}>
                    {formatDate(date)}
                    {isToday && <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Hoy</span>}
                  </p>
                  <p className="text-xs text-gray-400">
                    {count > 0 ? `${count} divisiones configuradas` : 'Sin configurar'}
                  </p>
                </div>
                <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
