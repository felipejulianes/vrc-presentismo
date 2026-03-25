'use client'

import { useState, useTransition } from 'react'
import { saveTercerTiempo, saveTercerTiempoVisitors } from '@/app/(app)/admin/sabados/actions'
import type { DivisionActivity, TercerTiempoReport, TercerTiempoVisitor, OpponentClub } from '@/lib/queries/sabados'

interface VisitorEntry {
  club_id: string
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

export function TercerTiempoCard({
  date,
  divisionId,
  divisionName,
  activity,
  existingReport,
  existingVisitors,
  attendanceCount,
  clubs,
}: Props) {
  // Only for home games
  if (activity.activity_type !== 'partido' || activity.venue !== 'local') return null

  return (
    <TercerTiempoCardInner
      date={date}
      divisionId={divisionId}
      divisionName={divisionName}
      activity={activity}
      existingReport={existingReport}
      existingVisitors={existingVisitors}
      attendanceCount={attendanceCount}
      clubs={clubs}
    />
  )
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
  // Coach uses coach_declared_* fields; coordinator's confirmed values are in local_*
  const [localKids, setLocalKids] = useState(
    existingReport?.coach_declared_kids?.toString() ?? attendanceCount.toString()
  )
  const [localCoaches, setLocalCoaches] = useState(
    existingReport?.coach_declared_coaches?.toString() ?? ''
  )
  const [notes, setNotes] = useState(existingReport?.notes ?? '')

  const [visitors, setVisitors] = useState<VisitorEntry[]>(() => {
    if (existingVisitors.length > 0) {
      return existingVisitors.map(v => ({
        club_id: v.club_id ?? '',
        kids: v.kids_count?.toString() ?? '',
        coaches: v.coaches_count?.toString() ?? '',
      }))
    }
    // Pre-fill opponent club if configured
    if (activity.opponent_club_id) {
      return [{ club_id: activity.opponent_club_id, kids: '', coaches: '' }]
    }
    return [{ club_id: '', kids: '', coaches: '' }]
  })

  const [saved, setSaved] = useState(!!existingReport)
  const [error, setError] = useState<string | null>(null)
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
    setError(null)
    const fd = new FormData()
    fd.append('activity_date', date)
    fd.append('division_id', divisionId)
    fd.append('source', 'coach')
    fd.append('coach_declared_kids', localKids)
    fd.append('coach_declared_coaches', localCoaches)
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

  return (
    <div className="px-4 pb-4">
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tercer tiempo</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Partido local</span>
            {activity.opponent_club_name && (
              <span className="text-xs text-gray-600">vs {activity.opponent_club_name}</span>
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

        <div className="px-4 py-3 space-y-3">
          {/* Local side — coach declares their estimate */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">{divisionName} (local)</p>
            <p className="text-xs text-gray-400 mb-2">Declará cuántos van al tercer tiempo</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Chicos</label>
                <input
                  type="number" min={0}
                  value={localKids}
                  onChange={e => setLocalKids(e.target.value)}
                  placeholder={`${attendanceCount} (lista)`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Entrenadores</label>
                <input
                  type="number" min={0}
                  value={localCoaches}
                  onChange={e => setLocalCoaches(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
                />
              </div>
            </div>
          </div>

          {/* Visitor clubs */}
          <div className="border-t border-gray-100 pt-3 space-y-3">
            <p className="text-xs font-semibold text-gray-600">Clubes visitantes</p>
            {visitors.map((v, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center gap-2">
                  <select
                    value={v.club_id}
                    onChange={e => updateVisitor(idx, 'club_id', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
                  >
                    <option value="">Sin especificar</option>
                    {clubs.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {visitors.length > 1 && (
                    <button
                      onClick={() => removeVisitor(idx)}
                      className="p-1.5 text-red-400 hover:text-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Chicos</label>
                    <input
                      type="number" min={0}
                      value={v.kids}
                      onChange={e => updateVisitor(idx, 'kids', e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Entrenadores</label>
                    <input
                      type="number" min={0}
                      value={v.coaches}
                      onChange={e => updateVisitor(idx, 'coaches', e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={addVisitor}
              className="text-xs text-vrc-green font-semibold hover:underline"
            >
              + Agregar otro club visitante
            </button>
          </div>

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
            {isPending ? 'Guardando...' : saved ? '✓ Reportado' : 'Reportar tercer tiempo'}
          </button>
        </div>
      </div>
    </div>
  )
}
