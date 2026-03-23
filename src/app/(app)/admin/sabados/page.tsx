import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** All Saturdays from today (or nearest past Saturday) through end of November */
function getSaturdaysUntilNovember(): string[] {
  const dates: string[] = []
  const today = new Date()
  const year = today.getFullYear()

  // Start from last Saturday (or today if Saturday)
  const dayOfWeek = today.getDay()
  const daysToLastSat = dayOfWeek === 6 ? 0 : (dayOfWeek + 1) % 7
  const start = new Date(today)
  start.setDate(today.getDate() - daysToLastSat)

  // End: last Saturday of November of current year
  const endOfNovember = new Date(year, 11, 0) // Nov 30
  const endDow = endOfNovember.getDay()
  const endOffset = endDow === 6 ? 0 : endDow + 1
  const end = new Date(endOfNovember)
  end.setDate(endOfNovember.getDate() - endOffset)

  const cur = new Date(start)
  while (cur <= end) {
    dates.push(toISO(cur))
    cur.setDate(cur.getDate() + 7)
  }
  return dates
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default async function SabadosPage() {
  const supabase = await createClient()
  const todayISO = toISO(new Date())

  const { data: activityRows } = await supabase
    .from('division_activities')
    .select('activity_date')

  // Count configured divisions per date
  const countMap: Record<string, number> = {}
  for (const r of activityRows ?? []) {
    countMap[r.activity_date] = (countMap[r.activity_date] ?? 0) + 1
  }

  const saturdays = getSaturdaysUntilNovember()

  // Also include any configured dates not in our Saturday list
  const extraDates = Object.keys(countMap).filter(d => !saturdays.includes(d))
  const allDates = [...saturdays, ...extraDates].sort()

  return (
    <div className="pb-6">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2">
        <Link href="/admin" className="p-1 text-gray-500">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Actividades</h1>
          <p className="text-sm text-gray-500">Partidos y entrenamientos del año</p>
        </div>
      </div>

      <div className="px-4">
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {allDates.map(date => {
            const count = countMap[date] ?? 0
            const isPast = date < todayISO
            const isToday = date === todayISO

            return (
              <Link
                key={date}
                href={`/admin/sabados/${date}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100"
              >
                <div className="flex-1">
                  <p className={`text-sm font-semibold capitalize ${isPast && !isToday ? 'text-gray-400' : 'text-gray-900'}`}>
                    {formatDate(date)}
                    {isToday && (
                      <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Hoy</span>
                    )}
                  </p>
                  <p className={`text-xs ${count > 0 ? 'text-green-600 font-medium' : isPast ? 'text-gray-300' : 'text-gray-400'}`}>
                    {count > 0 ? `${count} divisiones configuradas` : 'Sin configurar'}
                  </p>
                </div>
                <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
