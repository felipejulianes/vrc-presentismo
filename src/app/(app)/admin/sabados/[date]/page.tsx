import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  getActivitiesForDate,
  getAllBuses,
  getAllClubsFull,
  type DivisionActivity,
} from '@/lib/queries/sabados'
import { SabadoSetupGrid } from '@/components/admin/SabadoSetupGrid'

interface PageProps {
  params: { date: string }
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s))
}

function buildSummaryBanner(
  activities: DivisionActivity[],
  divNameById: Record<string, string>
): { emoji: string; label: string; divNames: string[] }[] {
  if (activities.length === 0) return []

  // Group by activity type + location
  const entrenamientos: string[] = []
  const locales: string[] = []
  const visitanteGroups: Record<string, string[]> = {}

  for (const act of activities) {
    const name = divNameById[act.division_id] ?? act.division_id
    if (act.activity_type === 'entrenamiento') {
      entrenamientos.push(name)
    } else if (act.activity_type === 'partido') {
      if (act.venue === 'local') {
        locales.push(name)
      } else {
        const locationLabel =
          act.location_venue_name ?? act.location_club_name ?? 'Por confirmar'
        if (!visitanteGroups[locationLabel]) visitanteGroups[locationLabel] = []
        visitanteGroups[locationLabel].push(name)
      }
    }
  }

  const lines: { emoji: string; label: string; divNames: string[] }[] = []
  if (entrenamientos.length > 0) lines.push({ emoji: '🏃', label: 'Entrena', divNames: entrenamientos })
  if (locales.length > 0) lines.push({ emoji: '⚽', label: 'Local', divNames: locales })
  for (const [loc, divs] of Object.entries(visitanteGroups)) {
    lines.push({ emoji: '✈️', label: `En ${loc}`, divNames: divs })
  }
  return lines
}

export default async function SabadoDatePage({ params }: PageProps) {
  const { date } = params
  if (!isValidDate(date)) notFound()

  const supabase = await createClient()

  const [divisions, activities, buses, clubs] = await Promise.all([
    supabase
      .from('divisions')
      .select('id, name, sort_order')
      .eq('is_juvenile', false)
      .order('sort_order')
      .then(r => r.data ?? []),
    getActivitiesForDate(date),
    getAllBuses(),
    getAllClubsFull(),
  ])

  const divNameById: Record<string, string> = {}
  for (const d of divisions) divNameById[d.id] = d.name

  const bannerLines = buildSummaryBanner(activities, divNameById)

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-2">
        <Link href="/admin/sabados" className="p-1 text-gray-500">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900 capitalize">{formatDate(date)}</h1>
          <p className="text-sm text-gray-500">
            {activities.length > 0 ? `${activities.length} divisiones configuradas` : 'Sin configurar aún'}
          </p>
        </div>
      </div>

      {/* ── SUMMARY BANNER ────────────────────────────────────── */}
      {bannerLines.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 mx-4 mb-3 space-y-1">
          {bannerLines.map(line => (
            <p key={line.label} className="text-xs text-gray-600">
              <span className="font-semibold">{line.emoji} {line.label}:</span>{' '}
              {line.divNames.join(', ')}
            </p>
          ))}
        </div>
      )}

      {/* ── CONFIGURAR ACTIVIDADES ────────────────────────────── */}
      <div className="px-4 pb-5">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Configurar actividades</h2>
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <SabadoSetupGrid
            date={date}
            divisions={divisions.map(d => ({ id: d.id, name: d.name }))}
            activities={activities}
            clubs={clubs}
            buses={buses}
          />
        </div>
      </div>

      {/* ── BONDIS + TERCER TIEMPO ───────────────────────────── */}
      <div className="px-4 pb-4 space-y-2">
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          <Link
            href="/admin/buses"
            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🚌</span>
              <div>
                <p className="text-sm font-medium text-gray-900">Bondis</p>
                <p className="text-xs text-gray-400">
                  {buses.length > 0
                    ? `${buses.length} disponibles — asignar en cada división arriba`
                    : 'Sin bondis en catálogo'}
                </p>
              </div>
            </div>
            <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            href={`/admin/tercer-tiempo?date=${date}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🥩</span>
              <div>
                <p className="text-sm font-medium text-gray-900">Tercer tiempo</p>
                <p className="text-xs text-gray-400">Cantidades confirmadas y horario</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
