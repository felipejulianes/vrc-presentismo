'use client'

import { useState } from 'react'
import { AbsenteeCard } from './AbsenteeCard'
import type { PlayerStat } from '@/lib/queries/stats'

type Mode = 'year' | 'days' | 'since'

interface StatsViewProps {
  divisionName: string
  statsByYear: PlayerStat[]
  statsByDays: PlayerStat[]
  statsSinceAlta: PlayerStat[]
  currentYear: number
}

export function StatsView({
  divisionName,
  statsByYear,
  statsByDays,
  statsSinceAlta,
  currentYear,
}: StatsViewProps) {
  const [mode, setMode] = useState<Mode>('year')

  const stats = mode === 'year' ? statsByYear : mode === 'days' ? statsByDays : statsSinceAlta

  // Orden descendente: mejor asistencia primero, null al final
  const sorted = [...stats].sort((a, b) => {
    if (a.attendance_pct === null) return 1
    if (b.attendance_pct === null) return -1
    return b.attendance_pct - a.attendance_pct
  })

  const total = stats.length
  const good = stats.filter(s => (s.attendance_pct ?? 0) >= 75).length
  const warning = stats.filter(s => {
    const p = s.attendance_pct ?? 0
    return p >= 50 && p < 75
  }).length
  const bad = stats.filter(s => (s.attendance_pct ?? 0) < 50).length

  const tabs: { key: Mode; label: string }[] = [
    { key: 'year', label: String(currentYear) },
    { key: 'days', label: 'Últimos 60d' },
    { key: 'since', label: 'Desde alta' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-xl font-bold text-gray-900">{divisionName}</h1>
        <p className="text-sm text-gray-500">Estadísticas de asistencia</p>
      </div>

      {/* Toggle de período */}
      <div className="px-4 pb-4">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setMode(tab.key)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
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

      {/* Resumen */}
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

      {/* Lista de jugadores */}
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
    </div>
  )
}
