'use client'

import { useState, useTransition } from 'react'
import { saveTercerTiempo } from '@/app/(app)/admin/sabados/actions'
import type { DivisionActivity, TercerTiempoReport, TercerTiempoVisitor, OpponentClub } from '@/lib/queries/sabados'

interface Division { id: string; name: string }

interface Props {
  date: string
  divisions: Division[]
  activities: DivisionActivity[]
  reports: TercerTiempoReport[]
  visitors: TercerTiempoVisitor[]
  clubs: OpponentClub[]
}

function formatTime(t: string | null | undefined): string {
  if (!t) return ''
  return t.slice(0, 5)
}

// Divisions grouped for summary cards
function groupDivisions(divisions: Division[]) {
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

export function TercerTiempoGrid({ date, divisions, activities, reports, visitors, clubs }: Props) {
  const clubById = Object.fromEntries(clubs.map(c => [c.id, c.name]))

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

  // Grand totals (coordinator confirmed)
  const totalKids = reports.reduce((s, r) => s + (r.local_kids_count ?? 0), 0)
  const totalCoaches = reports.reduce((s, r) => s + (r.local_coaches_count ?? 0), 0)
  const grandTotal = totalKids + totalCoaches
  const hasData = reports.some(r => r.local_kids_count !== null)

  const { prerugby, individual } = groupDivisions(homeDivisions)

  const prerugbyKids = prerugby.reduce((s, d) => s + (reportByDiv[d.id]?.local_kids_count ?? 0), 0)
  const prerugbyCoaches = prerugby.reduce((s, d) => s + (reportByDiv[d.id]?.local_coaches_count ?? 0), 0)
  const prerugbyTime = formatTime(
    prerugby.map(d => reportByDiv[d.id]?.tercer_tiempo_time).find(Boolean) ?? null
  )

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
            <p>Chicos: <strong>{totalKids}</strong></p>
            <p>Entrenadores: <strong>{totalCoaches}</strong></p>
          </div>
        </div>
      )}

      {/* Summary cards — one per category group */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Resumen por categoría</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {prerugby.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-3">
              <p className="text-xs font-bold text-gray-700">Prerugby</p>
              <p className="text-xs text-gray-400 mb-1">{prerugby.map(d => d.name).join(', ')}</p>
              <div className="flex items-end justify-between mt-1">
                <div>
                  <p className="text-lg font-bold text-green-700">{prerugbyKids || '—'}</p>
                  <p className="text-xs text-gray-400">chicos</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-600">{prerugbyCoaches || '—'}</p>
                  <p className="text-xs text-gray-400">entr.</p>
                </div>
              </div>
              {prerugbyTime && <p className="text-xs text-vrc-green font-semibold mt-1">🕐 {prerugbyTime}</p>}
            </div>
          )}
          {individual.map(d => {
            const rep = reportByDiv[d.id]
            const time = formatTime(rep?.tercer_tiempo_time)
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
                {time && <p className="text-xs text-vrc-green font-semibold mt-1">🕐 {time}</p>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Detailed input per division */}
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
              divisionVisitors={visitorsByDiv[div.id] ?? []}
              clubs={clubs}
              clubById={clubById}
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
  divisionVisitors: TercerTiempoVisitor[]
  clubs: OpponentClub[]
  clubById: Record<string, string>
}

function TercerTiempoRow({ date, division, activity, report, divisionVisitors, clubById }: RowProps) {
  // Coordinator's confirmed TOTAL (grand total: own + all visitors)
  const [totalKids, setTotalKids] = useState(report?.local_kids_count?.toString() ?? '')
  const [totalCoaches, setTotalCoaches] = useState(report?.local_coaches_count?.toString() ?? '')
  const [ttTime, setTtTime] = useState(formatTime(report?.tercer_tiempo_time))
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Coach's declared own counts
  const coachOwnKids = report?.coach_declared_kids
  const coachOwnCoaches = report?.coach_declared_coaches

  // Sum of coach-declared visitors
  const coachVisitorKids = divisionVisitors.reduce((s, v) => s + (v.kids_count ?? 0), 0)
  const coachVisitorCoaches = divisionVisitors.reduce((s, v) => s + (v.coaches_count ?? 0), 0)
  const coachTotalKids = (coachOwnKids ?? 0) + coachVisitorKids
  const coachTotalCoaches = (coachOwnCoaches ?? 0) + coachVisitorCoaches
  const hasCoachData = coachOwnKids !== null && coachOwnKids !== undefined

  function useCoachTotal() {
    setTotalKids(coachTotalKids.toString())
    setTotalCoaches(coachTotalCoaches.toString())
  }

  function handleSave() {
    const fd = new FormData()
    fd.append('activity_date', date)
    fd.append('division_id', division.id)
    fd.append('source', 'coord')
    fd.append('local_kids_count', totalKids)
    fd.append('local_coaches_count', totalCoaches)
    if (ttTime) fd.append('tercer_tiempo_time', ttTime)
    startTransition(async () => {
      const r = await saveTercerTiempo(fd)
      if (!r.error) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  const opponentText = (activity.opponent_club_ids?.length ?? 0) > 0
    ? activity.opponent_club_ids.map(id => clubById[id] ?? '').filter(Boolean).join(', ')
    : (activity.opponent_club_name ?? '')

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800">{division.name}</p>
          <p className="text-xs text-gray-400">Local{opponentText ? ` vs ${opponentText}` : ''}</p>
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

      {/* Coach declared — read-only reference breakdown */}
      {hasCoachData ? (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-blue-700">Declarado por el entrenador</p>
            <button
              onClick={useCoachTotal}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              Usar estos totales
            </button>
          </div>
          {/* Own */}
          <div className="flex gap-1.5 flex-wrap">
            <span className="text-xs bg-white border border-blue-200 rounded px-1.5 py-0.5 text-blue-700">
              {division.name}: {coachOwnKids} chicos · {coachOwnCoaches ?? '—'} entr.
            </span>
          </div>
          {/* Visitor clubs */}
          {divisionVisitors.filter(v => v.club_id).map(v => (
            <div key={v.club_id} className="flex gap-1.5">
              <span className="text-xs bg-white border border-blue-200 rounded px-1.5 py-0.5 text-blue-700">
                {v.club_name ?? clubById[v.club_id!] ?? '?'}: {v.kids_count ?? '—'} chicos · {v.coaches_count ?? '—'} entr.
              </span>
            </div>
          ))}
          <p className="text-xs font-semibold text-blue-800 pt-0.5">
            Total declarado: {coachTotalKids} chicos · {coachTotalCoaches} entr.
          </p>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
          <p className="text-xs text-gray-400">El entrenador aún no declaró los datos del tercer tiempo</p>
        </div>
      )}

      {/* Coordinator confirmed totals + time */}
      <div>
        <p className="text-xs text-gray-500 font-medium mb-2">Total confirmado (coordinador)</p>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">Chicos (total)</label>
            <input
              type="number" min={0}
              value={totalKids}
              onChange={e => setTotalKids(e.target.value)}
              placeholder="—"
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-vrc-green"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1">Entr. (total)</label>
            <input
              type="number" min={0}
              value={totalCoaches}
              onChange={e => setTotalCoaches(e.target.value)}
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
    </div>
  )
}
