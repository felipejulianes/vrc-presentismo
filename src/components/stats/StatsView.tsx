'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { AbsenteeCard } from './AbsenteeCard'
import type { PlayerStat, SessionTrend, DivisionKpis, SessionType } from '@/lib/queries/stats'
import { formatShortDate } from '@/lib/utils/dates'

type RankingMode = 'year' | 'days' | 'since'

const SESSION_TYPE_TABS: { key: SessionType; label: string }[] = [
  { key: 'sabado', label: 'Sábados' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'todo', label: 'Todo' },
]

interface StatsViewProps {
  divisionId: string
  divisionName: string
  sessionType: SessionType
  kpis: DivisionKpis
  statsByYear: PlayerStat[]
  statsByDays: PlayerStat[]
  statsSinceAlta: PlayerStat[]
  sessionTrend: SessionTrend[]
  currentYear: number
}

const SESSION_LIMITS = [10, 20, 50] as const

export function StatsView({
  divisionId,
  divisionName,
  sessionType,
  kpis,
  statsByYear,
  statsByDays,
  statsSinceAlta,
  sessionTrend,
  currentYear,
}: StatsViewProps) {
  const router = useRouter()
  const [rankingMode, setRankingMode] = useState<RankingMode>('year')
  const [sessionLimit, setSessionLimit] = useState<10 | 20 | 50>(20)

  const rankingTabs: { key: RankingMode; label: string }[] = [
    { key: 'year', label: String(currentYear) },
    { key: 'days', label: 'Últimos 30d' },
    { key: 'since', label: 'Desde alta' },
  ]

  const stats = rankingMode === 'year' ? statsByYear : rankingMode === 'days' ? statsByDays : statsSinceAlta
  const sorted = [...stats].sort((a, b) => {
    if (a.attendance_pct === null) return 1
    if (b.attendance_pct === null) return -1
    return b.attendance_pct - a.attendance_pct
  })

  const chartData = sessionTrend
    .slice(-sessionLimit)
    .map(s => ({ fecha: formatShortDate(s.session_date), Presentes: s.present_count }))

  const pct30d = kpis.totalActive > 0
    ? Math.round((kpis.came30d / kpis.totalActive) * 100)
    : 0

  function handleSessionTypeChange(type: SessionType) {
    const url = `/stats/${divisionId}${type !== 'todo' ? `?type=${type}` : ''}`
    router.push(url)
  }

  return (
    <div className="pb-24">
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

      <div className="px-4 pb-4">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {SESSION_TYPE_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleSessionTypeChange(tab.key)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                sessionType === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-4 grid grid-cols-3 gap-2">
        <div className="bg-white border border-gray-200 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-gray-900">{kpis.totalActive}</p>
          <p className="text-xs text-gray-500 mt-1 leading-tight">Jugadores</p>
        </div>
        <div className={`rounded-2xl p-3 text-center border ${
          pct30d >= 70 ? 'bg-green-50 border-green-200' : pct30d >= 40 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
        }`}>
          <p className={`text-2xl font-bold ${pct30d >= 70 ? 'text-green-700' : pct30d >= 40 ? 'text-yellow-700' : 'text-red-700'}`}>
            {kpis.came30d}
          </p>
          <p className={`text-xs mt-1 leading-tight ${pct30d >= 70 ? 'text-green-600' : pct30d >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
            Vinieron 30d
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{pct30d}%</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-gray-900">{kpis.avgPerSession}</p>
          <p className="text-xs text-gray-500 mt-1 leading-tight">Prom. / sesión</p>
        </div>
      </div>

      {sessionTrend.length > 0 && (
        <div className="px-4 pb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">Evolución por sesión</p>
            <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
              {SESSION_LIMITS.map(n => (
                <button
                  key={n}
                  onClick={() => setSessionLimit(n)}
                  className={`px-2 py-1 text-xs font-medium rounded transition-all ${
                    sessionLimit === n
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {n === 50 ? 'Todas' : `Últ. ${n}`}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-3">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="fecha" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  formatter={(v) => [v, 'Presentes']}
                />
                <Bar dataKey="Presentes" fill="#2b7a2b" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="px-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">Ranking de asistencia</p>
          <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
            {rankingTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setRankingMode(tab.key)}
                className={`px-2 py-1 text-xs font-medium rounded transition-all ${
                  rankingMode === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-8 text-gray-400 px-4">
          <p className="text-sm">No hay datos todavía. Tomá lista para ver estadísticas.</p>
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
