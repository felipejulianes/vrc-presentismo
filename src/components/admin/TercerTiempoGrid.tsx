'use client'

import { useState, useTransition } from 'react'
import { saveTercerTiempo } from '@/app/(app)/admin/sabados/actions'
import type { DivisionActivity, TercerTiempoReport, OpponentClub } from '@/lib/queries/sabados'

interface Division { id: string; name: string }

interface Props {
  date: string
  divisions: Division[]
  activities: DivisionActivity[]
  reports: TercerTiempoReport[]
  clubs: OpponentClub[]
}

export function TercerTiempoGrid({ date, divisions, activities, reports, clubs }: Props) {
  const activityByDiv: Record<string, DivisionActivity> = {}
  for (const a of activities) activityByDiv[a.division_id] = a

  const reportByDiv: Record<string, TercerTiempoReport> = {}
  for (const r of reports) reportByDiv[r.division_id] = r

  // Only show divisions that have an activity configured
  const activeDivisions = divisions.filter(d => activityByDiv[d.id])

  if (activeDivisions.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-4">
        Configurá las actividades primero para ver el tercer tiempo.
      </p>
    )
  }

  // Totals
  const totalLocalKids = reports.reduce((s, r) => s + (r.local_kids_count ?? 0), 0)
  const totalVisitorKids = reports.reduce((s, r) => s + (r.visitor_kids_count ?? 0), 0)
  const totalLocalCoaches = reports.reduce((s, r) => s + (r.local_coaches_count ?? 0), 0)
  const totalVisitorCoaches = reports.reduce((s, r) => s + (r.visitor_coaches_count ?? 0), 0)
  const grandTotal = totalLocalKids + totalVisitorKids + totalLocalCoaches + totalVisitorCoaches

  return (
    <div className="space-y-3">
      {/* Grand total summary */}
      {reports.length > 0 && (
        <div className="bg-vrc-green text-white rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs opacity-70 font-medium">Total tercer tiempo</p>
            <p className="text-2xl font-bold">{grandTotal} personas</p>
          </div>
          <div className="text-right text-xs opacity-80 space-y-0.5">
            <p>Chicos locales: <strong>{totalLocalKids}</strong></p>
            <p>Chicos visitantes: <strong>{totalVisitorKids}</strong></p>
            <p>Entrenadores: <strong>{totalLocalCoaches + totalVisitorCoaches}</strong></p>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[520px] bg-white border border-gray-200 rounded-xl overflow-hidden">
          <thead className="bg-gray-50">
            <tr className="text-gray-400 uppercase tracking-wide">
              <th className="text-left px-3 py-2 border-b border-gray-200">División</th>
              <th className="text-center px-2 py-2 border-b border-gray-200">Chicos<br/>propios</th>
              <th className="text-center px-2 py-2 border-b border-gray-200">Entr.<br/>propios</th>
              <th className="text-center px-2 py-2 border-b border-gray-200">Club<br/>visitante</th>
              <th className="text-center px-2 py-2 border-b border-gray-200">Chicos<br/>visit.</th>
              <th className="text-center px-2 py-2 border-b border-gray-200">Entr.<br/>visit.</th>
              <th className="w-8 border-b border-gray-200" />
            </tr>
          </thead>
          <tbody>
            {activeDivisions.map((div, i) => (
              <TercerTiempoRow
                key={div.id}
                date={date}
                division={div}
                activity={activityByDiv[div.id]}
                report={reportByDiv[div.id] ?? null}
                clubs={clubs}
                striped={i % 2 === 1}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Row ──────────────────────────────────────────────────────

interface RowProps {
  date: string
  division: Division
  activity: DivisionActivity
  report: TercerTiempoReport | null
  clubs: OpponentClub[]
  striped: boolean
}

function TercerTiempoRow({ date, division, activity, report, clubs, striped }: RowProps) {
  const isPartido = activity.activity_type === 'partido'

  const [localKids, setLocalKids] = useState(report?.local_kids_count?.toString() ?? '')
  const [localCoaches, setLocalCoaches] = useState(report?.local_coaches_count?.toString() ?? '')
  const [visitorClub, setVisitorClub] = useState(
    report?.visitor_club_id ?? activity?.opponent_club_id ?? ''
  )
  const [visitorKids, setVisitorKids] = useState(report?.visitor_kids_count?.toString() ?? '')
  const [visitorCoaches, setVisitorCoaches] = useState(report?.visitor_coaches_count?.toString() ?? '')
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    const fd = new FormData()
    fd.append('activity_date', date)
    fd.append('division_id', division.id)
    fd.append('local_kids_count', localKids)
    fd.append('local_coaches_count', localCoaches)
    if (isPartido && visitorClub) fd.append('visitor_club_id', visitorClub)
    if (isPartido) {
      fd.append('visitor_kids_count', visitorKids)
      fd.append('visitor_coaches_count', visitorCoaches)
    }
    startTransition(async () => {
      const res = await saveTercerTiempo(fd)
      if (!res.error) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  const bg = striped ? 'bg-gray-50' : 'bg-white'

  return (
    <tr className={`${bg} border-b border-gray-100 last:border-0`}>
      {/* Division */}
      <td className="px-3 py-2">
        <p className="font-semibold text-gray-800">{division.name}</p>
        {activity.activity_type === 'partido' && (
          <p className="text-gray-400 text-xs">
            {activity.venue === 'local' ? 'Local' : 'Visit.'}
            {activity.opponent_club_name ? ` vs ${activity.opponent_club_name}` : ''}
          </p>
        )}
        {activity.activity_type === 'entrenamiento' && (
          <p className="text-gray-400 text-xs">Entrena</p>
        )}
      </td>

      {/* Local kids */}
      <td className="px-2 py-2">
        <input
          type="number"
          min={0}
          value={localKids}
          onChange={e => setLocalKids(e.target.value)}
          placeholder="—"
          className="w-14 px-1.5 py-1 border border-gray-300 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-vrc-green"
        />
      </td>

      {/* Local coaches */}
      <td className="px-2 py-2">
        <input
          type="number"
          min={0}
          value={localCoaches}
          onChange={e => setLocalCoaches(e.target.value)}
          placeholder="—"
          className="w-14 px-1.5 py-1 border border-gray-300 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-vrc-green"
        />
      </td>

      {/* Visitor club */}
      <td className="px-2 py-2">
        {isPartido ? (
          <select
            value={visitorClub}
            onChange={e => setVisitorClub(e.target.value)}
            className="w-full px-1.5 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-vrc-green min-w-[70px]"
          >
            <option value="">—</option>
            {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>

      {/* Visitor kids */}
      <td className="px-2 py-2">
        {isPartido ? (
          <input
            type="number"
            min={0}
            value={visitorKids}
            onChange={e => setVisitorKids(e.target.value)}
            placeholder="—"
            className="w-14 px-1.5 py-1 border border-gray-300 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-vrc-green"
          />
        ) : <span className="text-gray-300">—</span>}
      </td>

      {/* Visitor coaches */}
      <td className="px-2 py-2">
        {isPartido ? (
          <input
            type="number"
            min={0}
            value={visitorCoaches}
            onChange={e => setVisitorCoaches(e.target.value)}
            placeholder="—"
            className="w-14 px-1.5 py-1 border border-gray-300 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-vrc-green"
          />
        ) : <span className="text-gray-300">—</span>}
      </td>

      {/* Save */}
      <td className="px-2 py-2">
        <button
          onClick={handleSave}
          disabled={isPending}
          className={`px-2 py-1 rounded text-xs font-semibold transition-all ${
            saved
              ? 'bg-green-100 text-green-700'
              : 'bg-vrc-green text-white hover:bg-green-800 disabled:opacity-50'
          }`}
        >
          {isPending ? '…' : saved ? '✓' : 'OK'}
        </button>
      </td>
    </tr>
  )
}
