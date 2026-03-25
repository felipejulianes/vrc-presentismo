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

export function TercerTiempoCard(props: Props) {
  // Only for home games
  if (props.activity.activity_type !== 'partido' || props.activity.venue !== 'local') return null
  return <TercerTiempoCardInner {...props} />
}

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
  // Opponent clubs come from fixture — coach cannot add/remove them
  const opponentClubs = (activity.opponent_club_ids ?? [])
    .map(id => clubs.find(c => c.id === id))
    .filter(Boolean) as OpponentClub[]

  // Own (local) declaration
  const [ownKids, setOwnKids] = useState(
    existingReport?.coach_declared_kids?.toString() ?? attendanceCount.toString()
  )
  const [ownCoaches, setOwnCoaches] = useState(
    existingReport?.coach_declared_coaches?.toString() ?? ''
  )
  const [notes, setNotes] = useState(existingReport?.notes ?? '')

  // Per-club visitor declarations — pre-populated from fixture clubs, seeded from existing data
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

  const [saved, setSaved] = useState(!!existingReport)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function updateVisitor(idx: number, field: 'kids' | 'coaches', value: string) {
    setVisitors(prev => prev.map((v, i) => i === idx ? { ...v, [field]: value } : v))
  }

  function useAttendanceCount() {
    setOwnKids(attendanceCount.toString())
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
        saveTercerTiempoVisitors(date, divisionId, visitorPayload),
      ])
      const err = r1.error ?? r2.error
      if (err) {
        setError(err)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  const opponentText = opponentClubs.length > 0
    ? opponentClubs.map(c => c.name).join(', ')
    : (activity.opponent_club_name ?? '')

  return (
    <div className="px-4 pb-4">
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tercer tiempo</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Partido local</span>
            {opponentText && (
              <span className="text-xs text-gray-600">vs {opponentText}</span>
            )}
            {activity.bus_label && (
              <span className="text-xs text-gray-400">· {activity.bus_label}</span>
            )}
          </div>
          {activity.bus_driver_phone && (
            <p className="text-xs text-gray-500 mt-0.5">
              Chofer:{' '}
              <a href={`tel:${activity.bus_driver_phone}`} className="text-blue-600 font-medium">
                {activity.bus_driver_phone}
              </a>
            </p>
          )}
        </div>

        <div className="px-4 py-3 space-y-4">

          {/* Attendance banner + own-kids declaration */}
          <div>
            {/* Attendance count — prominent */}
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 mb-3">
              <div>
                <p className="text-xs text-green-700 font-medium">Lista de hoy</p>
                <p className="text-2xl font-bold text-green-800 leading-none mt-0.5">{attendanceCount}
                  <span className="text-sm font-normal text-green-600 ml-1">presentes</span>
                </p>
              </div>
              {ownKids !== attendanceCount.toString() && (
                <button
                  onClick={useAttendanceCount}
                  className="text-xs text-green-700 font-semibold border border-green-300 rounded-lg px-2.5 py-1.5 hover:bg-green-100"
                >
                  Usar este número
                </button>
              )}
            </div>

            <p className="text-xs font-semibold text-gray-600 mb-2">{divisionName} (propios)</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Chicos al 3° tiempo</label>
                <input
                  type="number" min={0}
                  value={ownKids}
                  onChange={e => setOwnKids(e.target.value)}
                  placeholder={attendanceCount.toString()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-vrc-green"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Entrenadores</label>
                <input
                  type="number" min={0}
                  value={ownCoaches}
                  onChange={e => setOwnCoaches(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-vrc-green"
                />
              </div>
            </div>
          </div>

          {/* Visitor clubs — fixed from fixture, coach fills counts */}
          {visitors.length > 0 && (
            <div className="border-t border-gray-100 pt-3 space-y-3">
              <p className="text-xs font-semibold text-gray-600">Clubes visitantes</p>
              {visitors.map((v, idx) => (
                <div key={v.club_id} className="space-y-1">
                  <p className="text-xs font-medium text-gray-700 px-0.5">{v.club_name}</p>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Chicos</label>
                      <input
                        type="number" min={0}
                        value={v.kids}
                        onChange={e => updateVisitor(idx, 'kids', e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-vrc-green"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Entrenadores</label>
                      <input
                        type="number" min={0}
                        value={v.coaches}
                        onChange={e => updateVisitor(idx, 'coaches', e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-vrc-green"
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
              placeholder="Observaciones del día..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            onClick={handleSave}
            disabled={isPending}
            className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${
              saved
                ? 'bg-green-100 text-green-700'
                : 'bg-vrc-green hover:bg-green-800 text-white disabled:opacity-50'
            }`}
          >
            {isPending ? 'Guardando...' : saved ? '✓ Declaración enviada' : 'Declarar tercer tiempo'}
          </button>
        </div>
      </div>
    </div>
  )
}
