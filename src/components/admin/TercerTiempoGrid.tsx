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

// Divisions grouped for the summary cards
// Prerugby = M6, M7, M8 (category prerugby); others are individual
function groupDivisionsForSummary(divisions: Division[]) {
  const prerugby: Division[] = []
  const individual: Division[] = []
  for (const d of divisions) {
    if (d.name === 'M6' || d.name === 'M7' || d.name === 'M8') {
      prerugby.push(d)
    } else {
      individual.push(d)
    }
  }
  return { prerugby, individual }
}

function formatTime(t: string | null): string {
  if (!t) return ''
  // DB returns "HH:MM:SS" or "HH:MM" — trim to HH:MM
  return t.slice(0, 5)
}

export function TercerTiempoGrid({ date, divisions, activities, reports, visitors, clubs }: Props) {
  const activityByDiv: Record<string, DivisionActivity> = {}
  for (const a of activities) activityByDiv[a.division_id] = a

  const reportByDiv: Record<string, TercerTiempoReport> = {}
  for (const r of reports) reportByDiv[r.division_id] = r

  const visitorsByDiv: Record<string, TercerTiempoVisitor[]> = {}
  for (const v of visitors) {
    if (!visitorsByDiv[v.division_id]) visitorsByDiv[v.division_id] = []
    visitorsByDiv[v.division_id].push(v)
  }

  // Only divisions playing at home
  const homeDivisions = divisions.filter(d => {
    const a = activityByDiv[d.id]
    return a?.activity_type === 'partido' && a?.venue === 'local'
  })

  if (homeDivisions.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-4">
        El tercer tiempo aplica solo a partidos de local. Configurá actividades primero.
      </p>
    )
  }

  // Grand totals (using coordinator's confirmed values)
  const totalLocalKids = reports.reduce((s, r) => s + (r.local_kids_count ?? 0), 0)
  const totalLocalCoaches = reports.reduce((s, r) => s + (r.local_coaches_count ?? 0), 0)
  const totalVisitorKids = visitors.reduce((s, v) => s + (v.kids_count ?? 0), 0)
  const totalVisitorCoaches = visitors.reduce((s, v) => s + (v.coaches_count ?? 0), 0)
  const grandTotal = totalLocalKids + totalLocalCoaches + totalVisitorKids + totalVisitorCoaches
  const hasData = reports.length > 0 || visitors.length > 0

  // Summary cards grouping
  const { prerugby, individual } = groupDivisionsForSummary(homeDivisions)

  // Prerugby aggregate
  const prerugbyKids = prerugby.reduce((s, d) => s + (reportByDiv[d.id]?.local_kids_count ?? 0), 0)
  const prerugbyCoaches = prerugby.reduce((s, d) => s + (reportByDiv[d.id]?.local_coaches_count ?? 0), 0)
  // Take the tercer_tiempo_time from the first prerugby division that has one
  const prerugbyTime = formatTime(prerugby.find(d => reportByDiv[d.id]?.tercer_tiempo_time)
    ? (reportByDiv[prerugby.find(d => reportByDiv[d.id]?.tercer_tiempo_time)!.id]?.tercer_tiempo_time ?? null)
    : null)

  return (
    <div className="space-y-4">
      {/* Grand total banner */}
      {hasData && (
        <div className="bg-vrc-green text-white rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs opacity-70 font-medium">Total confirmado</p>
            <p className="text-2xl font-bold">{grandTotal} personas</p>
          </div>
          <div className="text-right text-xs opacity-80 space-y-0.5">
            <p>Chicos loc.: <strong>{totalLocalKids}</strong></p>
            <p>Chicos vis.: <strong>{totalVisitorKids}</strong></p>
            <p>Entrenadores: <strong>{totalLocalCoaches + totalVisitorCoaches}</strong></p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Resumen por categoría</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {/* Prerugby card (M6+M7+M8 combined) */}
          {prerugby.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-3">
              <p className="text-xs font-bold text-gray-700">Prerugby</p>
              <p className="text-xs text-gray-400 mb-1">{prerugby.map(d => d.name).join(', ')}</p>
              <div className="flex items-end justify-between mt-1">
                <div>
                  <p className="text-lg font-bold text-green-700">{prerugbyKids}</p>
                  <p className="text-xs text-gray-400">chicos</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-600">{prerugbyCoaches}</p>
                  <p className="text-xs text-gray-400">entr.</p>
                </div>
              </div>
              {prerugbyTime && (
                <p className="text-xs text-vrc-green font-semibold mt-1">🕐 {prerugbyTime}</p>
              )}
            </div>
          )}

          {/* Individual cards per division */}
          {individual.map(d => {
            const rep = reportByDiv[d.id]
            const time = formatTime(rep?.tercer_tiempo_time ?? null)
            return (
              <div key={d.id} className="bg-white border border-gray-200 rounded-xl p-3">
                <p className="text-xs font-bold text-gray-700">{d.name}</p>
                <div className="flex items-end justify-between mt-1">
                  <div>
                    <p className="text-lg font-bold text-green-700">{rep?.local_kids_count ?? '—'}</p>
                    <p className="text-xs text-gray-400">chicos</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-600">{rep?.local_coaches_count ?? '—'}</p>
                    <p className="text-xs text-gray-400">entr.</p>
                  </div>
                </div>
                {time && (
                  <p className="text-xs text-vrc-green font-semibold mt-1">🕐 {time}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Detailed coordinator input per division */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Detalle por división</p>
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
  // Coordinator's confirmed values
  const [localKids, setLocalKids] = useState(report?.local_kids_count?.toString() ?? '')
  const [localCoaches, setLocalCoaches] = useState(report?.local_coaches_count?.toString() ?? '')
  const [ttTime, setTtTime] = useState(formatTime(report?.tercer_tiempo_time ?? null))

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

  // Coach's declared values — read-only reference
  const coachKids = report?.coach_declared_kids
  const coachCoaches = report?.coach_declared_coaches

  function addVisitor() {
    setVisitors(prev => [...prev, { club_id: '', kids: '', coaches: '' }])
  }

  function removeVisitor(idx: number) {
    setVisitors(prev => prev.filter((_, i) => i !== idx))
  }

  function updateVisitor(idx: number, field: keyof VisitorEntry, value: string) {
    setVisitors(prev => prev.map((v, i) => i === idx ? { ...v, [field]: value } : v))
  }

  function useCoachValues() {
    if (coachKids !== null && coachKids !== undefined) setLocalKids(coachKids.toString())
    if (coachCoaches !== null && coachCoaches !== undefined) setLocalCoaches(coachCoaches.toString())
  }

  function handleSave() {
    const fd = new FormData()
    fd.append('activity_date', date)
    fd.append('division_id', division.id)
    fd.append('source', 'coord')
    fd.append('local_kids_count', localKids)
    fd.append('local_coaches_count', localCoaches)
    if (ttTime) fd.append('tercer_tiempo_time', ttTime)

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

  const opponentText = activity.opponent_club_ids?.length > 1
    ? `${activity.opponent_club_name ?? ''} +${activity.opponent_club_ids.length - 1}`
    : (activity.opponent_club_name ?? '')

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800">{division.name}</p>
          <p className="text-xs text-gray-400">
            Local{opponentText ? ` vs ${opponentText}` : ''}
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
          {isPending ? '…' : saved ? '✓ Guardado' : 'Confirmar'}
        </button>
      </div>

      {/* Coach declared — read-only reference */}
      {(coachKids !== null && coachKids !== undefined) && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-700">Declarado por el entrenador</p>
            <p className="text-xs text-blue-600 mt-0.5">
              {coachKids} chicos · {coachCoaches ?? '—'} entr.
            </p>
          </div>
          <button
            onClick={useCoachValues}
            className="text-xs text-blue-600 font-semibold hover:underline"
          >
            Usar estos valores
          </button>
        </div>
      )}

      {/* Coordinator confirmed values */}
      <div>
        <p className="text-xs text-gray-500 font-medium mb-2">Valores confirmados (coordinador)</p>
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
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">Hora 3° tiempo</label>
            <input
              type="time"
              value={ttTime}
              onChange={e => setTtTime(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-vrc-green"
            />
          </div>
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
