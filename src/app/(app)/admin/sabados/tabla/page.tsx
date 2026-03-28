import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { FixtureTable } from '@/components/admin/FixtureTable'

type CellValue = 'E' | 'L' | 'V'

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getSaturdaysUntilNovember(year: number, todayISO: string): string[] {
  const dates: string[] = []
  const today = new Date(todayISO + 'T00:00:00')
  const cur = new Date(today)
  // Find the next or current Saturday
  const dow = cur.getDay()
  const daysToSat = dow === 6 ? 0 : (6 - dow)
  cur.setDate(cur.getDate() + daysToSat)
  const end = new Date(year, 10, 30) // Nov 30
  while (cur <= end) {
    dates.push(toISO(cur))
    cur.setDate(cur.getDate() + 7)
  }
  return dates
}

export default async function FixtureTablPage() {
  const supabase = await createClient()
  const today = new Date()
  const todayISO = toISO(today)
  const year = today.getFullYear()

  const [divisionsRaw, actRowsRaw] = await Promise.all([
    supabase
      .from('divisions')
      .select('id, name, sort_order')
      .eq('is_juvenile', false)
      .order('sort_order')
      .then(r => r.data ?? []),
    supabase
      .from('division_activities')
      .select(
        'division_id, activity_date, activity_type, venue, location_club:location_club_id(name), location_venue:location_venue_id(name)'
      )
      .gte('activity_date', `${year}-01-01`)
      .lte('activity_date', `${year}-11-30`)
      .then(r => r.data ?? []),
  ])

  const divisions = divisionsRaw as { id: string; name: string; sort_order: number }[]

  // Map activity rows
  const pickName = (v: unknown): string | null => {
    if (!v) return null
    if (Array.isArray(v)) return (v[0] as Record<string, string>)?.name ?? null
    return (v as Record<string, string>)?.name ?? null
  }

  const actRows = (actRowsRaw as Record<string, unknown>[]).map(r => ({
    division_id: r.division_id as string,
    activity_date: r.activity_date as string,
    activity_type: r.activity_type as string,
    venue: r.venue as string | null,
    location_name: pickName(r.location_venue) ?? pickName(r.location_club),
  }))

  // Build past dates (dates with at least 1 activity, before today)
  const pastDatesSet = new Set<string>()
  for (const row of actRows) {
    if (row.activity_date < todayISO) pastDatesSet.add(row.activity_date)
  }

  // Build future saturdays from today until end of November
  const futureSaturdays = getSaturdaysUntilNovember(year, todayISO)

  // Merge + sort + dedup
  const allDatesSet = new Set<string>(Array.from(pastDatesSet).concat(futureSaturdays))
  const dates = Array.from(allDatesSet).sort()

  // Build cells and locations
  const cells: Record<string, Record<string, CellValue>> = {}
  const locations: Record<string, Record<string, string>> = {}

  for (const row of actRows) {
    const { division_id, activity_date, activity_type, venue, location_name } = row
    if (!cells[division_id]) cells[division_id] = {}
    if (!locations[division_id]) locations[division_id] = {}

    let cell: CellValue
    if (activity_type === 'entrenamiento') {
      cell = 'E'
    } else if (venue === 'local') {
      cell = 'L'
    } else {
      cell = 'V'
    }
    cells[division_id][activity_date] = cell
    if (cell === 'V' && location_name) {
      locations[division_id][activity_date] = location_name
    }
  }

  // Build counts
  const counts: Record<string, {
    ePast: number; eFuture: number
    lPast: number; lFuture: number
    vPast: number; vFuture: number
  }> = {}

  for (const div of divisions) {
    const divCells = cells[div.id] ?? {}
    let ePast = 0, eFuture = 0, lPast = 0, lFuture = 0, vPast = 0, vFuture = 0
    for (const [d, v] of Object.entries(divCells)) {
      const isPast = d < todayISO
      if (v === 'E') { if (isPast) ePast++; else eFuture++ }
      else if (v === 'L') { if (isPast) lPast++; else lFuture++ }
      else if (v === 'V') { if (isPast) vPast++; else vFuture++ }
    }
    counts[div.id] = { ePast, eFuture, lPast, lFuture, vPast, vFuture }
  }

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="px-4 pt-4 pb-1 flex items-center gap-2">
        <Link href="/admin/sabados" className="p-1 text-gray-500">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tabla de fixture {year}</h1>
          <p className="text-sm text-gray-500">Girá el celular para verla mejor</p>
        </div>
      </div>

      <FixtureTable
        divisions={divisions.map(d => ({ id: d.id, name: d.name }))}
        dates={dates}
        todayISO={todayISO}
        cells={cells}
        locations={locations}
        counts={counts}
      />
    </div>
  )
}
