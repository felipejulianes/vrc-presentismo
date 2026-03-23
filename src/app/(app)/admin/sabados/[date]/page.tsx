import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  getActivitiesForDate,
  getBusesForDate,
  getOpponentClubs,
  getTercerTiempoForDate,
} from '@/lib/queries/sabados'
import { SabadoSetupList } from '@/components/admin/SabadoSetupList'
import { BusesManager } from '@/components/admin/BusesManager'
import { TercerTiempoCard } from '@/components/attendance/TercerTiempoCard'

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

export default async function SabadoDatePage({ params }: PageProps) {
  const { date } = params

  if (!isValidDate(date)) notFound()

  const supabase = await createClient()

  const [divisions, activities, buses, clubs, reports] = await Promise.all([
    supabase
      .from('divisions')
      .select('id, name, sort_order')
      .order('sort_order')
      .then(r => r.data ?? []),
    getActivitiesForDate(date),
    getBusesForDate(date),
    getOpponentClubs(),
    getTercerTiempoForDate(date),
  ])

  const reportByDiv: Record<string, (typeof reports)[0]> = {}
  for (const r of reports) reportByDiv[r.division_id] = r

  const activityByDiv: Record<string, (typeof activities)[0]> = {}
  for (const a of activities) activityByDiv[a.division_id] = a

  // Tercer tiempo totals
  const totalLocalKids = reports.reduce((s, r) => s + (r.local_kids_count ?? 0), 0)
  const totalLocalCoaches = reports.reduce((s, r) => s + (r.local_coaches_count ?? 0), 0)
  const totalVisitorKids = reports.reduce((s, r) => s + (r.visitor_kids_count ?? 0), 0)
  const totalVisitorCoaches = reports.reduce((s, r) => s + (r.visitor_coaches_count ?? 0), 0)
  const hasReports = reports.length > 0

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
          <p className="text-sm text-gray-500">{activities.length} divisiones configuradas</p>
        </div>
      </div>

      {/* ── TERCER TIEMPO RESUMEN ─────────────────────────────── */}
      {hasReports && (
        <div className="px-4 pb-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tercer tiempo — resumen</h2>
          <div className="bg-vrc-green rounded-2xl p-4 text-white grid grid-cols-2 gap-3">
            <div className="text-center">
              <p className="text-3xl font-bold">{totalLocalKids}</p>
              <p className="text-xs opacity-70">Chicos locales</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{totalVisitorKids}</p>
              <p className="text-xs opacity-70">Chicos visitantes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{totalLocalCoaches}</p>
              <p className="text-xs opacity-70">Entren. locales</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{totalVisitorCoaches}</p>
              <p className="text-xs opacity-70">Entren. visitantes</p>
            </div>
          </div>
          <div className="mt-2 bg-white border border-gray-200 rounded-xl px-4 py-2 text-center">
            <p className="text-sm text-gray-500">
              Total para tercer tiempo:{' '}
              <span className="font-bold text-gray-900 text-base">
                {totalLocalKids + totalVisitorKids + totalLocalCoaches + totalVisitorCoaches}
              </span>{' '}
              personas
            </p>
          </div>
        </div>
      )}

      {/* ── TERCER TIEMPO POR DIVISIÓN (para completar/editar) ─ */}
      <div className="px-4 pb-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Reporte por división
        </h2>
        <div className="space-y-0">
          {divisions.map(div => {
            const activity = activityByDiv[div.id] ?? null
            const report = reportByDiv[div.id] ?? null
            if (!activity) return null
            return (
              <TercerTiempoCard
                key={div.id}
                date={date}
                divisionId={div.id}
                divisionName={div.name}
                activity={activity}
                existingReport={report}
                attendanceCount={0}
                clubs={clubs}
              />
            )
          })}
          {activities.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              Configurá las actividades abajo para ver el reporte de tercer tiempo.
            </p>
          )}
        </div>
      </div>

      {/* ── CONFIGURAR ACTIVIDADES ─────────────────────────────── */}
      <div className="px-4 pb-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Configurar actividades</h2>
        <SabadoSetupList
          date={date}
          divisions={divisions.map(d => ({ id: d.id, name: d.name }))}
          activities={activities}
          clubs={clubs}
          buses={buses}
        />
      </div>

      {/* ── BONDIS ────────────────────────────────────────────── */}
      <div className="px-4 pb-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bondis</h2>
        <BusesManager date={date} buses={buses} />
      </div>
    </div>
  )
}
