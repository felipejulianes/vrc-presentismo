'use client'

import { useState, useTransition } from 'react'
import { saveTercerTiempo, saveTercerTiempoVisitors } from '@/app/(app)/admin/sabados/actions'
import type { DivisionActivity, TercerTiempoReport, TercerTiempoVisitor, OpponentClub } from '@/lib/queries/sabados'

interface Division { id: string; name: string }

interface VisitorEntry {
  club_id: string
  kids: string
  coaches: string
}

interface Props {
  date: string
  divisions: Division[]
  activities: DivisionActivity[]
  reports: TercerTiempoReport[]
  visitors: TercerTiempoVisitor[]
  clubs: OpponentClub[]
}

export function TercerTiempoGrid({ date, divisions, activities, reports, visitors, clubs }: Props) {
  const activityByDiv: Record<string, DivisionActivity> = {}
  for (const a of activities) activityByDiv[a.division_id] = a

  const reportByDiv: Record<string, TercerTiempoReport> = {}
  for (const r of reports) reportByDiv[r.division_id] = r

  // Only show divisions playing at home
  const homeDivisions = divisions.filter(d => {
    const a = activityByDiv[d.id]
    return a?.activity_type === 'partido' && a?.venue === 'local'
  })

  // Group visitors by division
  const visitorsByDiv: Record<string, TercerTiempoVisitor[]> = {}
  for (const v of visitors) {
    if (!visitorsByDiv[v.division_id]) visitorsByDiv[v.division_id] = []
    visitorsByDiv[v.division_id].push(v)
  }

  if (homeDivisions.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-4">
        El tercer tiempo aplica solo a partidos de local. Configurá actividades primero.
      </p>
    )
  }

  // Totals
  const totalLocalKids = reports.reduce((s, r) => s + (r.local_kids_count ?? 0), 0)
  const totalLocalCoaches = reports.reduce((s, r) => s + (r.local_coaches_count ?? 0), 0)
  const totalVisitorKids = visitors.reduce((s, v) => s + (v.kids_count ?? 0), 0)
  const totalVisitorCoaches = visitors.reduce((s, v) => s + (v.coaches_count ?? 0), 0)
  const grandTotal = totalLocalKids + totalLocalCoaches + totalVisitorKids + totalVisitorCoaches

  return (
    <div className="space-y-3">
      {/* Grand total summary */}
      {(reports.length > 0 || visitors.length > 0) && (
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

      {/* Rows per division */}
      <div className="space-y-3">
        {homeDivisions.map(div => (
          <TercerTiempoRow
            key={div.id}
            date={date}
            division={div}
            activity={activityByDiv[div.id]}
            report={reportByDiv[div.id] ?? null}
            existingVisitors={visitorsByDiv[div.id] ?? []}
            clubs={clubs}
          />
        ))}
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
  existingVisitors: TercerTiempoVisitor[]
  clubs: OpponentClub[]
}

function TercerTiempoRow({ date, division, activity, report, existingVisitors, clubs }: RowProps) {
  const [localKids, setLocalKids] = useState(report?.local_kids_count?.toString() ?? '')
  const [localCoaches, setLocalCoaches] = useState(report?.local_coaches_count?.toString() ?? '')

  const [visitors, setVisitors] = useState<VisitorEntry[]>(() => {
    if (existingVisitors.length > 0) {
      return existingVisitors.map(v => ({
        club_id: v.club_id ?? '',
        kids: v.kids_count?.toString() ?? '',
        coaches: v.coaches_count?.toString() ?? '',
      }))
    }
    return [{ club_id: activity.opponent_club_id ?? '', kids: '', coaches: '' }]
  })

  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function addVisitor() {
    setVisitors(prev => [...prev, { club_id: '', kids: '', coaches: '' }])
  }

  function removeVisitor(idx: number) {
    setVisitors(prev => prev.filter((_, i) => i !== idx))
  }

  function updateVisitor(idx: number, field: keyof VisitorEntry, value: string) {
    setVisitors(prev => prev.map((v, i) => i === idx ? { ...v, [field]: value } : v))
  }

  function handleSave() {
    const fd = new FormData()
    fd.append('activity_date', date)
    fd.append('division_id', division.id)
    fd.append('local_kids_count', localKids)
    fd.append('local_coaches_count', localCoaches)

    const visitorPayload = visitors
      .filter(v => v.club_id)
      .map(v => ({
        club_id: v.club_id,
        kids_count: v.kids !== '' ? parseInt(v.kids) : null,
        coaches_count: v.coaches !== '' ? parseInt(v.coaches) : null,
      }))

    startTransition(async () => {
      const [r1, r2] = await Promise.all([
        saveTercerTiempo(fd),
        saveTercerTiempoVisitors(date, division.id, visitorPayload),
      ])
      if (!r1.error && !r2.error) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800">{division.name}</p>
          <p className="text-xs text-gray-400">
            Local{activity.opponent_club_name ? ` vs ${activity.opponent_club_name}` : ''}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isPending}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            saved
              ? 'bg-green-100 text-green-700'
              : 'bg-vrc-green text-white hover:bg-green-800 disabled:opacity-50'
          }`}
        >
          {isPending ? '…' : saved ? '✓' : 'Guardar'}
        </button>
      </div>

      {/* Local */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-xs text-gray-400 mb-1">Chicos locales</label>
          <input
            type="number" min={0}
            value={localKids}
            onChange={e => setLocalKids(e.target.value)}
            placeholder="—"
            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-vrc-green"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-400 mb-1">Entr. locales</label>
          <input
            type="number" min={0}
            value={localCoaches}
            onChange={e => setLocalCoaches(e.target.value)}
            placeholder="—"
            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-vrc-green"
          />
        </div>
      </div>

      {/* Visitors */}
      <div className="border-t border-gray-100 pt-2 space-y-2">
        <p className="text-xs font-semibold text-gray-500">Clubes visitantes</p>
        {visitors.map((v, idx) => (
          <div key={idx} className="flex gap-2 items-end">
            <div className="flex-[2]">
              {idx === 0 && <label className="block text-xs text-gray-400 mb-1">Club</label>}
              <select
                value={v.club_id}
                onChange={e => updateVisitor(idx, 'club_id', e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-vrc-green"
              >
                <option value="">—</option>
                {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex-1">
              {idx === 0 && <label className="block text-xs text-gray-400 mb-1">Chicos</label>}
              <input
                type="number" min={0}
                value={v.kids}
                onChange={e => updateVisitor(idx, 'kids', e.target.value)}
                placeholder="—"
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-vrc-green"
              />
            </div>
            <div className="flex-1">
              {idx === 0 && <label className="block text-xs text-gray-400 mb-1">Entr.</label>}
              <input
                type="number" min={0}
                value={v.coaches}
                onChange={e => updateVisitor(idx, 'coaches', e.target.value)}
                placeholder="—"
                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-vrc-green"
              />
            </div>
            {visitors.length > 1 && (
              <button
                onClick={() => removeVisitor(idx)}
                className="pb-1 text-red-400 hover:text-red-600"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addVisitor}
          className="text-xs text-vrc-green font-semibold hover:underline"
        >
          + Agregar club
        </button>
      </div>
    </div>
  )
}
