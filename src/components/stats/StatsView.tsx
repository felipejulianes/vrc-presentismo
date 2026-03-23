'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AbsenteeCard } from './AbsenteeCard'
import type { PlayerStat, SessionTrend } from '@/lib/queries/stats'

type Mode = 'year' | 'days' | 'since' | 'trend'

interface StatsViewProps {
  divisionName: string
  divisionId: string
  statsByYear: PlayerStat[]
  statsByDays: PlayerStat[]
  statsSinceAlta: PlayerStat[]
  sessionTrend: SessionTrend[]
  currentYear: number
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function TrendBar({ pct }: { pct: number | null }) {
  const value = pct ?? 0
  const color = value >= 75 ? 'bg-green-500' : value >= 50 ? 'bg-yellow-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-sm font-semibold text-gray-700 w-9 text-right">{value}%</span>
    </div>
  )
}

export function StatsView({
  divisionName,
  divisionId,
  statsByYear,
  statsByDays,
  statsSinceAlta,
  sessionTrend,
  currentYear,
}: StatsViewProps) {
  const [mode, setMode] = useState<Mode>('year')

  const tabs: { key: Mode; label: string }[] = [
    { key: 'year', label: String(currentYear) },
    { key: 'days', label: 'Últimos 60d' },
    { key: 'since', label: 'Desde alta' },
    { key: 'trend', label: 'Tendencia' },
  ]

  const stats = mode === 'year' ? statsByYear : mode === 'days' ? statsByDays : statsSinceAlta

  const sorted = [...stats].sort((a, b) => {
    if (a.attendance_pct === null) return 1
    if (b.attendance_pct === null) return -1
    return b.attendance_pct - a.attendance_pct
  })

  const total = stats.length
  const good = stats.filter(s => (s.attendance_pct ?? 0) >= 75).length
  const warning = stats.filter(s => { const p = s.attendance_pct ?? 0; return p >= 50 && p < 75 }).length
  const bad = stats.filter(s => (s.attendance_pct ?? 0) < 50).length

  return (
    <div>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-2">
        <Link href="/stats" className="p-1 text-gray-500">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{divisionName}</h1>
          <p className="text-sm text-gray-500">Estadísticas de asistencia</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-4">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setMode(tab.key)}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                mode === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TENDENCIA ─────────────────────────────── */}
      {mode === 'trend' && (
        <div className="px-4 pb-4 space-y-2">
          {sessionTrend.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p>No hay sesiones registradas todavía.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-3">Últimas {sessionTrend.length} sesiones — más reciente arriba</p>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {sessionTrend.map(s => (
                  <Link
                    key={s.session_date}
                    href={`/attendance/${divisionId}`}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <div className="w-28 flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-800 capitalize">{formatDate(s.session_date)}</p>
                      <p className="text-xs text-gray-400">{s.present_count}/{s.total_count} presentes</p>
                    </div>
                    <TrendBar pct={s.attendance_pct} />
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── JUGADORES (year/days/since) ───────────── */}
      {mode !== 'trend' && (
        <>
          {total > 0 && (
            <div className="px-4 pb-4 grid grid-cols-3 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{good}</p>
                <p className="text-xs text-green-600 mt-0.5">≥75%</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-yellow-600">{warning}</p>
                <p className="text-xs text-yellow-600 mt-0.5">50–74%</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{bad}</p>
                <p className="text-xs text-red-600 mt-0.5">&lt;50%</p>
              </div>
            </div>
          )}

          {sorted.length === 0 ? (
            <div className="text-center py-16 text-gray-400 px-4">
              <p>No hay datos de asistencia todavía.</p>
              <p className="text-sm mt-1">Tomá lista para ver estadísticas aquí.</p>
            </div>
          ) : (
            <div className="bg-white border-t border-b border-gray-200 divide-y divide-gray-100">
              {sorted.map(stat => (
                <AbsenteeCard key={stat.player_id} stat={stat} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
