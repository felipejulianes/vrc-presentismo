'use client'

import { useState, useTransition } from 'react'
import { saveTercerTiempo } from '@/app/(app)/admin/sabados/actions'
import type { DivisionActivity, TercerTiempoReport, OpponentClub } from '@/lib/queries/sabados'

interface Props {
  date: string
  divisionId: string
  divisionName: string
  activity: DivisionActivity | null
  existingReport: TercerTiempoReport | null
  attendanceCount: number
  clubs: OpponentClub[]
}

export function TercerTiempoCard({
  date,
  divisionId,
  divisionName,
  activity,
  existingReport,
  attendanceCount,
  clubs,
}: Props) {
  const isPartido = activity?.activity_type === 'partido'

  const [localKids, setLocalKids] = useState(
    existingReport?.local_kids_count?.toString() ?? attendanceCount.toString()
  )
  const [localCoaches, setLocalCoaches] = useState(
    existingReport?.local_coaches_count?.toString() ?? ''
  )
  const [visitorClubId, setVisitorClubId] = useState(
    existingReport?.visitor_club_id ?? activity?.opponent_club_id ?? ''
  )
  const [visitorKids, setVisitorKids] = useState(
    existingReport?.visitor_kids_count?.toString() ?? ''
  )
  const [visitorCoaches, setVisitorCoaches] = useState(
    existingReport?.visitor_coaches_count?.toString() ?? ''
  )
  const [notes, setNotes] = useState(existingReport?.notes ?? '')
  const [saved, setSaved] = useState(!!existingReport)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError(null)
    const fd = new FormData()
    fd.append('activity_date', date)
    fd.append('division_id', divisionId)
    fd.append('local_kids_count', localKids)
    fd.append('local_coaches_count', localCoaches)
    if (isPartido && visitorClubId) fd.append('visitor_club_id', visitorClubId)
    if (isPartido) {
      fd.append('visitor_kids_count', visitorKids)
      fd.append('visitor_coaches_count', visitorCoaches)
    }
    if (notes) fd.append('notes', notes)

    startTransition(async () => {
      const res = await saveTercerTiempo(fd)
      if (res.error) {
        setError(res.error)
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
            {activity ? (
              <>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isPartido ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                  {isPartido ? 'Partido' : 'Entrenamiento'}
                </span>
                {isPartido && activity.opponent_club_name && (
                  <span className="text-xs text-gray-600">vs {activity.opponent_club_name}</span>
                )}
                {isPartido && activity.venue && (
                  <span className={`text-xs font-medium ${activity.venue === 'local' ? 'text-green-600' : 'text-orange-600'}`}>
                    ({activity.venue})
                  </span>
                )}
                {activity.bus_label && (
                  <span className="text-xs text-gray-400">· {activity.bus_label}</span>
                )}
              </>
            ) : (
              <span className="text-xs text-gray-400">Sin actividad definida</span>
            )}
          </div>
          {activity?.location_notes && (
            <p className="text-xs text-gray-400 mt-0.5">{activity.location_notes}</p>
          )}
          {activity?.bus_driver_phone && (
            <p className="text-xs text-gray-500 mt-0.5">
              Chofer:{' '}
              <a href={`tel:${activity.bus_driver_phone}`} className="text-blue-600 font-medium">
                {activity.bus_driver_phone}
              </a>
            </p>
          )}
        </div>

        <div className="px-4 py-3 space-y-3">
          {/* Local side */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">
              {divisionName} {isPartido && activity?.venue ? `(${activity.venue})` : ''}
            </p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Chicos</label>
                <input
                  type="number"
                  min={0}
                  value={localKids}
                  onChange={e => setLocalKids(e.target.value)}
                  placeholder={`${attendanceCount} (lista)`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Entrenadores</label>
                <input
                  type="number"
                  min={0}
                  value={localCoaches}
                  onChange={e => setLocalCoaches(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
                />
              </div>
            </div>
          </div>

          {/* Visitor side (only for partido) */}
          {isPartido && (
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">
                Visitante {activity?.venue === 'local' ? '' : '(nosotros)'}
              </p>
              <div className="mb-2">
                <label className="block text-xs text-gray-500 mb-1">Club rival</label>
                <select
                  value={visitorClubId}
                  onChange={e => setVisitorClubId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
                >
                  <option value="">Sin especificar</option>
                  {clubs.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Chicos</label>
                  <input
                    type="number"
                    min={0}
                    value={visitorKids}
                    onChange={e => setVisitorKids(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Entrenadores</label>
                  <input
                    type="number"
                    min={0}
                    value={visitorCoaches}
                    onChange={e => setVisitorCoaches(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
                  />
                </div>
              </div>
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
            {isPending ? 'Guardando...' : saved ? '✓ Reportado' : 'Reportar tercer tiempo'}
          </button>
        </div>
      </div>
    </div>
  )
}
