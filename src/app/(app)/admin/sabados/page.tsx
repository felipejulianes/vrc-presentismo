import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getSaturdaysUntilNovember(): string[] {
  const dates: string[] = []
  const today = new Date()
  const year = today.getFullYear()
  const dayOfWeek = today.getDay()
  const daysToLastSat = dayOfWeek === 6 ? 0 : (dayOfWeek + 1) % 7
  const start = new Date(today)
  start.setDate(today.getDate() - daysToLastSat)
  const endOfNovember = new Date(year, 11, 0)
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
  return new Date(Number(y), Number(m) - 1, Number(d))
    .toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default async function SabadosPage() {
  const supabase = await createClient()
  const todayISO = toISO(new Date())

  // Fetch activities with opponent club name for preview
  const { data: activityRows } = await supabase
    .from('division_activities')
    .select('activity_date, activity_type, opponent_clubs:opponent_club_id(name)')

  // Build per-date summaries
  type DateSummary = {
    count: number
    hasPartido: boolean
    hasEntrenamiento: boolean
    opponentNames: string[]
  }
  const summaryByDate: Record<string, DateSummary> = {}

  for (const r of (activityRows ?? []) as Record<string, unknown>[]) {
    const date = r.activity_date as string
    if (!summaryByDate[date]) {
      summaryByDate[date] = { count: 0, hasPartido: false, hasEntrenamiento: false, opponentNames: [] }
    }
    const s = summaryByDate[date]
    s.count++
    if (r.activity_type === 'partido') {
      s.hasPartido = true
      const name = Array.isArray(r.opponent_clubs)
        ? (r.opponent_clubs[0] as Record<string, string>)?.name
        : (r.opponent_clubs as Record<string, string> | null)?.name
      if (name && !s.opponentNames.includes(name)) s.opponentNames.push(name)
    } else {
      s.hasEntrenamiento = true
    }
  }

  const saturdays = getSaturdaysUntilNovember()
  const extraDates = Object.keys(summaryByDate).filter(d => !saturdays.includes(d))
  const allDates = [...saturdays, ...extraDates].sort()

  function buildPreview(s: DateSummary | undefined): string {
    if (!s) return 'Sin configurar'
    const parts: string[] = []
    if (s.hasPartido) {
      const clubs = s.opponentNames.slice(0, 2).join(', ')
      parts.push(`⚽ Partido${clubs ? ` vs ${clubs}` : ''}`)
    }
    if (s.hasEntrenamiento) parts.push('🏃 Entrena')
    return parts.join(' · ') || `${s.count} div.`
  }

  return (
    <div className="pb-6">
      <div className="px-4 pt-4 pb-3 flex items-center gap-2">
        <Link href="/admin" className="p-1 text-gray-500">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Fixture</h1>
          <p className="text-sm text-gray-500">Planificación de actividades del año</p>
        </div>
      </div>

      <div className="px-4">
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {allDates.map(date => {
            const summary = summaryByDate[date]
            const isPast = date < todayISO
            const isToday = date === todayISO
            const preview = buildPreview(summary)
            const isConfigured = !!summary

            return (
              <Link
                key={date}
                href={`/admin/sabados/${date}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100"
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold capitalize truncate ${isPast && !isToday ? 'text-gray-400' : 'text-gray-900'}`}>
                    {formatDate(date)}
                    {isToday && (
                      <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Hoy</span>
                    )}
                  </p>
                  <p className={`text-xs truncate ${isConfigured ? (isPast && !isToday ? 'text-gray-400' : 'text-gray-600') : (isPast ? 'text-gray-300' : 'text-gray-400')}`}>
                    {preview}
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
