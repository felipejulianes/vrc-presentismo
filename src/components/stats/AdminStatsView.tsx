'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LabelList,
} from 'recharts'
import type { DivisionStat, AdminTrendData } from '@/lib/queries/stats'
import { formatShortDate } from '@/lib/utils/dates'

interface Props {
  totalActive: number
  came30d: number
  divisionStats: DivisionStat[]
  trendData: AdminTrendData
}

type TrendLimit = 10 | 20 | 'year'

export function AdminStatsView({ totalActive, came30d, divisionStats, trendData }: Props) {
  const [trendLimit, setTrendLimit] = useState<TrendLimit>(20)

  const pct30d = useMemo(
    () => totalActive > 0 ? Math.round((came30d / totalActive) * 100) : 0,
    [totalActive, came30d]
  )

  // Division bars — sorted descending by totalActive (more players first)
  const sortedDivisions = useMemo(
    () => [...divisionStats].sort((a, b) => b.totalActive - a.totalActive),
    [divisionStats]
  )
  const maxTotal = useMemo(
    () => Math.max(...sortedDivisions.map(d => d.totalActive), 1),
    [sortedDivisions]
  )

  // Trend dates — ascending order
  const currentYear = new Date().getFullYear()
  const trendDates = useMemo(
    () =>
      trendLimit === 'year'
        ? trendData.dates.filter(d => d.startsWith(`${currentYear}-`))
        : trendData.dates.slice(-trendLimit),
    [trendLimit, trendData.dates, currentYear]
  )

  // Chart data with precomputed _total for labels
  const trendChartData = useMemo(
    () =>
      trendData.data
        .filter(d => trendDates.includes(d.date))
        .map(d => {
          const total = trendData.divisions.reduce(
            (sum, div) => sum + ((d[div.name] as number) ?? 0), 0
          )
          return { ...d, date: formatShortDate(d.date), _total: total }
        }),
    [trendData.data, trendData.divisions, trendDates]
  )

  // Show total label on bars only when showing 10 sessions
  const showLabels = trendLimit === 10

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
          <p className="text-xs text-gray-500 mt-1">Jugadores</p>
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
            const barWidthPct = (div.totalActive / maxTotal) * 100
            const cameSegPct = div.totalActive > 0 ? (div.came30d / div.totalActive) * 100 : 0
            const absentSegPct = 100 - cameSegPct
            return (
              <Link key={div.id} href={`/stats/${div.id}`} className="block group">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-600 w-8 flex-shrink-0">{div.name}</span>
                  <div className="flex-1 h-5 rounded-full overflow-hidden bg-transparent">
                    <div className="h-full flex rounded-full overflow-hidden" style={{ width: `${barWidthPct}%` }}>
                      {cameSegPct > 0 && <div className="h-full bg-vrc-green" style={{ width: `${cameSegPct}%` }} />}
                      {absentSegPct > 0 && <div className="h-full bg-green-200" style={{ width: `${absentSegPct}%` }} />}
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
              {([10, 20, 'year'] as TrendLimit[]).map(n => (
                <button
                  key={n}
                  onClick={() => setTrendLimit(n)}
                  className={`px-2 py-1 text-xs font-medium rounded transition-all ${
                    trendLimit === n
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {n === 'year' ? `${currentYear}` : `Últ. ${n}`}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-3">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={trendChartData} margin={{ top: showLabels ? 16 : 4, right: 4, left: -20, bottom: 0 }}>
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
                {/* Bars in ascending order: M6 at bottom, M14 at top */}
                {trendData.divisions.map((div, i) => {
                  const isTop = i === trendData.divisions.length - 1
                  return (
                    <Bar
                      key={div.id}
                      dataKey={div.name}
                      stackId="a"
                      fill={div.color}
                      maxBarSize={32}
                    >
                      {/* Total label only on the topmost bar, only when showing 10 */}
                      {isTop && showLabels && (
                        <LabelList
                          dataKey="_total"
                          position="top"
                          style={{ fontSize: 9, fill: '#6b7280', fontWeight: 600 }}
                        />
                      )}
                    </Bar>
                  )
                })}
                {/* Custom legend — reversed so M14 is first (top) and M6 is last (bottom) */}
                <Legend
                  iconType="square"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
                  formatter={(value, entry, index) => {
                    // Reverse by index so highest division appears first in legend
                    void entry; void index
                    return value
                  }}
                  content={(props) => {
                    const { payload } = props
                    const reversed = [...(payload ?? [])].reverse()
                    return (
                      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 pt-2">
                        {reversed.map((entry, i) => (
                          <span key={i} className="flex items-center gap-1 text-[10px] text-gray-600">
                            <span
                              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                              style={{ background: entry.color }}
                            />
                            {entry.value}
                          </span>
                        ))}
                      </div>
                    )
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Data table */}
          {trendChartData.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Detalle por fecha</p>
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="min-w-max text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="sticky left-0 bg-gray-50 z-10 px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-200 min-w-[52px]">
                        División
                      </th>
                      {trendChartData.map((d, i) => (
                        <th
                          key={i}
                          className="px-2 py-2 text-center font-medium text-gray-600 border-b border-r border-gray-200 min-w-[44px] whitespace-nowrap"
                        >
                          {d.date}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Rows in ascending order: M6 first, M14 last */}
                    {trendData.divisions.map((div, ri) => (
                      <tr key={div.id} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                        <td className={`sticky left-0 z-10 px-3 py-1.5 font-semibold border-b border-r border-gray-200 ${ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <span className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-sm flex-shrink-0"
                              style={{ background: div.color }}
                            />
                            {div.name}
                          </span>
                        </td>
                        {trendChartData.map((d, ci) => {
                          const val = (d as Record<string, number | string>)[div.name] as number ?? 0
                          return (
                            <td
                              key={ci}
                              className={`px-2 py-1.5 text-center border-b border-r border-gray-200 ${
                                val > 0 ? 'text-gray-800 font-medium' : 'text-gray-300'
                              }`}
                            >
                              {val > 0 ? val : '—'}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-semibold">
                      <td className="sticky left-0 bg-gray-100 z-10 px-3 py-1.5 text-gray-700 border-t border-r border-gray-200">
                        Total
                      </td>
                      {trendChartData.map((d, i) => (
                        <td key={i} className="px-2 py-1.5 text-center text-gray-800 border-t border-r border-gray-200">
                          {d._total}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="text-xs text-gray-400 mt-1.5 px-1">Deslizá para ver todas las fechas →</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
