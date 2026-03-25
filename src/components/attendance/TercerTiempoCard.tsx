'use client'

import { useState, useTransition } from 'react'
import { saveTercerTiempo, saveTercerTiempoVisitors } from '@/app/(app)/admin/sabados/actions'
import type { DivisionActivity, TercerTiempoReport, TercerTiempoVisitor, OpponentClub } from '@/lib/queries/sabados'

interface VisitorState {
  club_id: string
  club_name: string
  kids: string
  coaches: string
}

interface Props {
  date: string
  divisionId: string
  divisionName: string
  activity: DivisionActivity
  existingReport: TercerTiempoReport | null
  existingVisitors: TercerTiempoVisitor[]
  attendanceCount: number
  clubs: OpponentClub[]
}

// Only render for home games
export function TercerTiempoCard(props: Props) {
  if (props.activity.activity_type !== 'partido' || props.activity.venue !== 'local') return null
  return <TercerTiempoCardInner {...props} />
}

type Mode = 'idle' | 'form' | 'declared'

function TercerTiempoCardInner({
  date,
  divisionId,
  divisionName,
  activity,
  existingReport,
  existingVisitors,
  attendanceCount,
  clubs,
}: Props) {
  const opponentClubs = (activity.opponent_club_ids ?? [])
    .map(id => clubs.find(c => c.id === id))
    .filter(Boolean) as OpponentClub[]

  const opponentText = opponentClubs.length > 0
    ? opponentClubs.map(c => c.name).join(', ')
    : (activity.opponent_club_name ?? '')

  // Initial mode: if already declared → show summary; else → idle button
  const [mode, setMode] = useState<Mode>(existingReport ? 'declared' : 'idle')

  // Form state — initialized from existing or defaults
  const [ownKids, setOwnKids] = useState(
    existingReport?.coach_declared_kids?.toString() ?? attendanceCount.toString()
  )
  const [ownCoaches, setOwnCoaches] = useState(
    existingReport?.coach_declared_coaches?.toString() ?? ''
  )
  const [notes, setNotes] = useState(existingReport?.notes ?? '')
  const [visitors, setVisitors] = useState<VisitorState[]>(() =>
    opponentClubs.map(c => {
      const existing = existingVisitors.find(v => v.club_id === c.id)
      return {
        club_id: c.id,
        club_name: c.name,
        kids: existing?.kids_count?.toString() ?? '',
        coaches: existing?.coaches_count?.toString() ?? '',
      }
    })
  )

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  // Track whether editing (came from declared state)
  const [wasEditing, setWasEditing] = useState(false)

  function openForm(editing = false) {
    setWasEditing(editing)
    setError(null)
    setMode('form')
  }

  function cancel() {
    setMode(wasEditing ? 'declared' : 'idle')
  }

  function updateVisitor(idx: number, field: 'kids' | 'coaches', value: string) {
    setVisitors(prev => prev.map((v, i) => i === idx ? { ...v, [field]: value } : v))
  }

  function handleSave() {
    setError(null)
    const fd = new FormData()
    fd.append('activity_date', date)
    fd.append('division_id', divisionId)
    fd.append('source', 'coach')
    fd.append('coach_declared_kids', ownKids)
    fd.append('coach_declared_coaches', ownCoaches)
    if (notes) fd.append('notes', notes)

    const visitorPayload = visitors.map(v => ({
      club_id: v.club_id,
      kids_count: v.kids !== '' ? parseInt(v.kids) : null,
      coaches_count: v.coaches !== '' ? parseInt(v.coaches) : null,
    }))

    startTransition(async () => {
      const [r1, r2] = await Promise.all([
        saveTercerTiempo(fd),
        saveTercerTiempoVisitors(date, divisionId, visitorPayload),
      ])
      const err = r1.error ?? r2.error
      if (err) {
        setError(err)
      } else {
        setMode('declared')
      }
    })
  }

  // ── Activity header (shown in all modes) ────────────────
  const header = (
    <div className="px-4 pt-3 pb-2 bg-blue-50 border-b border-blue-100">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">⚽ Partido local</span>
        {opponentText && <span className="text-xs text-blue-700 font-medium">vs {opponentText}</span>}
        {activity.bus_label && (
          <span className="text-xs text-blue-500">· Bondi: {activity.bus_label}</span>
        )}
      </div>
      {activity.bus_driver_phone && (
        <p className="text-xs text-blue-600 mt-0.5">
          Chofer: <a href={`tel:${activity.bus_driver_phone}`} className="font-semibold">{activity.bus_driver_phone}</a>
        </p>
      )}
    </div>
  )

  // ── MODE: idle ───────────────────────────────────────────
  if (mode === 'idle') {
    return (
      <div className="px-4 pb-4">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {header}
          <div className="px-4 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-700">Tercer tiempo</p>
              <p className="text-xs text-gray-400 mt-0.5">No declarado todavía</p>
            </div>
            <button
              onClick={() => openForm(false)}
              className="flex-shrink-0 px-4 py-2 bg-vrc-green text-white rounded-xl text-sm font-semibold hover:bg-green-800"
            >
              Declarar
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── MODE: declared ───────────────────────────────────────
  if (mode === 'declared') {
    const totalKids = (parseInt(ownKids) || 0) + visitors.reduce((s, v) => s + (parseInt(v.kids) || 0), 0)
    const totalCoaches = (parseInt(ownCoaches) || 0) + visitors.reduce((s, v) => s + (parseInt(v.coaches) || 0), 0)

    return (
      <div className="px-4 pb-4">
        <div className="bg-white rounded-2xl border border-green-200 overflow-hidden">
          {header}
          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-green-700">✓ Tercer tiempo declarado</p>
              <button
                onClick={() => openForm(true)}
                className="text-xs text-gray-500 hover:text-gray-800 underline"
              >
                Modificar
              </button>
            </div>

            {/* Summary */}
            <div className="bg-green-50 rounded-xl px-3 py-2 space-y-1">
              <div className="flex gap-4 text-xs">
                <span className="text-gray-600 font-medium">{divisionName} (propios):</span>
                <span className="text-gray-800">{ownKids || '—'} chicos · {ownCoaches || '—'} entr.</span>
              </div>
              {visitors.filter(v => v.kids || v.coaches).map(v => (
                <div key={v.club_id} className="flex gap-4 text-xs">
                  <span className="text-gray-600 font-medium">{v.club_name}:</span>
                  <span className="text-gray-800">{v.kids || '—'} chicos · {v.coaches || '—'} entr.</span>
                </div>
              ))}
              <div className="border-t border-green-200 pt-1 mt-1">
                <span className="text-xs font-bold text-green-800">Total: {totalKids} chicos · {totalCoaches} entr.</span>
              </div>
            </div>
            {notes && <p className="text-xs text-gray-500 italic">{notes}</p>}
          </div>
        </div>
      </div>
    )
  }

  // ── MODE: form ───────────────────────────────────────────
  return (
    <div className="px-4 pb-4">
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {header}
        <div className="px-4 py-3 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Declarar tercer tiempo</p>
            <button onClick={cancel} className="text-xs text-gray-400 hover:text-gray-600">
              Cancelar
            </button>
          </div>

          {/* Own (local) team */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">
              {divisionName}{' '}
              <span className="font-normal text-gray-400">
                · {attendanceCount} presentes en lista
              </span>
            </p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Chicos al 3° tiempo</label>
                <input
                  type="number" min={0}
                  value={ownKids}
                  onChange={e => setOwnKids(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-vrc-green"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Entrenadores</label>
                <input
                  type="number" min={0}
                  value={ownCoaches}
                  onChange={e => setOwnCoaches(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-vrc-green"
                />
              </div>
            </div>
          </div>

          {/* Visitor clubs from fixture */}
          {visitors.length > 0 && (
            <div className="border-t border-gray-100 pt-3 space-y-3">
              {visitors.map((v, idx) => (
                <div key={v.club_id}>
                  <p className="text-xs font-semibold text-gray-600 mb-2">{v.club_name}</p>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Chicos</label>
                      <input
                        type="number" min={0}
                        value={v.kids}
                        onChange={e => updateVisitor(idx, 'kids', e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-vrc-green"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Entrenadores</label>
                      <input
                        type="number" min={0}
                        value={v.coaches}
                        onChange={e => updateVisitor(idx, 'coaches', e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-vrc-green"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nota (opcional)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observaciones..."
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            onClick={handleSave}
            disabled={isPending}
            className="w-full py-3 bg-vrc-green hover:bg-green-800 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-all"
          >
            {isPending ? 'Guardando...' : wasEditing ? 'Guardar cambios' : 'Confirmar declaración'}
          </button>
        </div>
      </div>
    </div>
  )
}
