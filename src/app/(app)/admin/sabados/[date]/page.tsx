import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  getActivitiesForDate,
  getBusesForDate,
  getOpponentClubs,
  getTercerTiempoForDate,
} from '@/lib/queries/sabados'
import { SabadoSetupGrid } from '@/components/admin/SabadoSetupGrid'
import { BusesManager } from '@/components/admin/BusesManager'
import { TercerTiempoGrid } from '@/components/admin/TercerTiempoGrid'

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

      {/* ── BONDIS ──────────────────────────────────────────── */}
      <div className="px-4 pb-5">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bondis</h2>
        <BusesManager date={date} buses={buses} />
      </div>

      {/* ── TERCER TIEMPO ────────────────────────────────────── */}
      <div className="px-4 pb-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tercer tiempo</h2>
        <TercerTiempoGrid
          date={date}
          divisions={divisions.map(d => ({ id: d.id, name: d.name }))}
          activities={activities}
          reports={reports}
          clubs={clubs}
        />
      </div>
    </div>
  )
}
