import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  getActivitiesForDate,
  getTercerTiempoForDate,
  getTercerTiempoVisitorsForDate,
  getOpponentClubs,
} from '@/lib/queries/sabados'
import { TercerTiempoGrid } from '@/components/admin/TercerTiempoGrid'

interface PageProps {
  searchParams: { date?: string }
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** All Saturdays from today (or last Saturday) through end of November */
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

function formatDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d))
    .toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateShort(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d))
    .toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

export default async function TercerTiempoPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const todayISO = toISO(new Date())
  const saturdays = getSaturdaysUntilNovember()

  // Default to the nearest upcoming Saturday with local home game, or just today's nearest Saturday
  const selectedDate = searchParams.date ?? saturdays.find(d => d >= todayISO) ?? saturdays[0] ?? todayISO

  const [divisions, activities, reports, visitors, clubs] = await Promise.all([
    supabase
      .from('divisions')
      .select('id, name, sort_order')
      .eq('is_juvenile', false)
      .order('sort_order')
      .then(r => r.data ?? []),
    getActivitiesForDate(selectedDate),
    getTercerTiempoForDate(selectedDate),
    getTercerTiempoVisitorsForDate(selectedDate),
    getOpponentClubs(),
  ])

  const homeDivisionsCount = activities.filter(
    a => a.activity_type === 'partido' && a.venue === 'local'
  ).length

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-2">
        <Link href="/admin" className="p-1 text-gray-500">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tercer tiempo</h1>
          <p className="text-sm text-gray-500 capitalize">{formatDateLong(selectedDate)}</p>
        </div>
      </div>

      {/* Date picker — horizontal scroll of Saturdays */}
      <div className="px-4 pb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {saturdays.map(sat => {
            const isSelected = sat === selectedDate
            const isPast = sat < todayISO
            const isToday = sat === todayISO
            return (
              <Link
                key={sat}
                href={`/admin/tercer-tiempo?date=${sat}`}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold text-center transition-all border min-w-[64px] ${
                  isSelected
                    ? 'bg-vrc-green text-white border-vrc-green'
                    : isPast
                    ? 'bg-gray-50 text-gray-300 border-gray-100'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-vrc-green'
                }`}
              >
                <span className="block">{formatDateShort(sat)}</span>
                {isToday && <span className="block text-[10px] mt-0.5 opacity-80">Hoy</span>}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Status of selected date */}
      {homeDivisionsCount === 0 && (
        <div className="px-4 pb-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-sm font-medium text-amber-800">Sin partidos de local este sábado</p>
            <p className="text-xs text-amber-600 mt-0.5">
              El tercer tiempo aplica solo cuando VRC juega de local.{' '}
              <Link href={`/admin/sabados/${selectedDate}`} className="underline font-semibold">
                Ir al fixture
              </Link>{' '}
              para configurar actividades.
            </p>
          </div>
        </div>
      )}

      {/* Tercer tiempo grid */}
      {homeDivisionsCount > 0 && (
        <div className="px-4">
          <TercerTiempoGrid
            date={selectedDate}
            divisions={divisions.map(d => ({ id: d.id, name: d.name }))}
            activities={activities}
            reports={reports}
            visitors={visitors}
            clubs={clubs}
          />
        </div>
      )}
    </div>
  )
}
