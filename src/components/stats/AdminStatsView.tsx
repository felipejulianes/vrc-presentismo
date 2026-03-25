'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import type { DivisionStat, AdminTrendData } from '@/lib/queries/stats'

interface Props {
  totalActive: number
  came30d: number
  divisionStats: DivisionStat[]
  trendData: AdminTrendData
}

function formatShortDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  return `${d}/${m}`
}

const TREND_LIMITS = [10, 20] as const

export function AdminStatsView({ totalActive, came30d, divisionStats, trendData }: Props) {
  const [trendLimit, setTrendLimit] = useState<10 | 20>(20)

  const pct30d = totalActive > 0 ? Math.round((came30d / totalActive) * 100) : 0

  // Division bars — sorted descending by totalActive (more players first)
  const sortedDivisions = [...divisionStats].sort((a, b) => b.totalActive - a.totalActive)
  const maxTotal = Math.max(...sortedDivisions.map(d => d.totalActive), 1)

  // Trend chart data — last N unique dates
  const trendDates = trendData.dates.slice(-trendLimit)
  const trendChartData = trendData.data
    .filter(d => trendDates.includes(d.date))
    .map(d => ({ ...d, date: formatShortDate(d.date) }))

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-xl font-bold text-gray-900">Estadísticas generales</h1>
        <p className="text-sm text-gray-500">Todas las divisiones · M6 a M14</p>
      </div>

      {/* KPI cards */}
      <div className="px-4 pb-4 grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{totalActive}</p>
          <p className="text-xs text-gray-500 mt-1">Jugadores activos</p>
        </div>
        <div className={`rounded-2xl p-4 text-center border ${
          pct30d >= 70 ? 'bg-green-50 border-green-200' : pct30d >= 40 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
        }`}>
          <p className={`text-3xl font-bold ${pct30d >= 70 ? 'text-green-700' : pct30d >= 40 ? 'text-yellow-700' : 'text-red-700'}`}>
            {came30d}
          </p>
          <p className={`text-xs mt-1 ${pct30d >= 70 ? 'text-green-600' : pct30d >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
            Vinieron últimos 30d
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{pct30d}% del plantel</p>
        </div>
      </div>

      {/* Division comparison bars */}
      <div className="px-4 pb-5">
        <p className="text-sm font-semibold text-gray-700 mb-3">Por división — últimos 30 días</p>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
          {/* Legend */}
          <div className="flex gap-4 text-xs text-gray-500 mb-1">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-vrc-green inline-block" />
              Vinieron ≥1 vez
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-green-200 inline-block" />
              No vinieron
            </span>
          </div>

          {sortedDivisions.map(div => {
            // Bar total width proportional to totalActive vs the max division
            const barWidthPct = (div.totalActive / maxTotal) * 100
            // Within that bar: dark = came30d, light = didn't come
            const cameSegPct = div.totalActive > 0 ? (div.came30d / div.totalActive) * 100 : 0
            const absentSegPct = 100 - cameSegPct
            return (
              <Link
                key={div.id}
                href={`/stats/${div.id}`}
                className="block group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-600 w-8 flex-shrink-0">{div.name}</span>
                  {/* Outer container: full width, transparent — sets scale */}
                  <div className="flex-1 h-5 rounded-full overflow-hidden bg-transparent">
                    {/* Bar: takes only barWidthPct of the space, split into two segments */}
                    <div className="h-full flex rounded-full overflow-hidden" style={{ width: `${barWidthPct}%` }}>
                      {cameSegPct > 0 && (
                        <div className="h-full bg-vrc-green" style={{ width: `${cameSegPct}%` }} />
                      )}
                      {absentSegPct > 0 && (
                        <div className="h-full bg-green-200" style={{ width: `${absentSegPct}%` }} />
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 w-14 flex-shrink-0 text-right">
                    <span className="font-semibold text-green-700">{div.came30d}</span>
                    <span className="text-gray-400">/{div.totalActive}</span>
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mt-2 px-1">Tocá una división para ver el detalle por jugador</p>
      </div>

      {/* Stacked trend chart */}
      {trendData.dates.length > 0 && (
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">Tendencia general</p>
            <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
              {TREND_LIMITS.map(n => (
                <button
                  key={n}
                  onClick={() => setTrendLimit(n)}
                  className={`px-2 py-1 text-xs font-medium rounded transition-all ${
                    trendLimit === n
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Últ. {n}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-3">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trendChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
                {trendData.divisions.map(div => (
                  <Bar
                    key={div.id}
                    dataKey={div.name}
                    stackId="a"
                    fill={div.color}
                    maxBarSize={32}
                  />
                ))}
                <Legend
                  iconType="square"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
