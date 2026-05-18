'use client'

import { useState, useTransition } from 'react'
import {
  saveDivisionActivity,
  deleteDivisionActivity,
  addOpponentClub,
} from '@/app/(app)/admin/sabados/actions'
import type { DivisionActivity, OpponentClub, EventBus } from '@/lib/queries/sabados'

interface Division {
  id: string
  name: string
}

interface Props {
  date: string
  divisions: Division[]
  activities: DivisionActivity[]
  clubs: OpponentClub[]
  buses: EventBus[]
}

const VENUE_LABELS = { local: 'Local', visitante: 'Visitante' }

export function SabadoSetupList({ date, divisions, activities, clubs: initialClubs, buses }: Props) {
  const [clubs, setClubs] = useState(initialClubs)
  const [newClubName, setNewClubName] = useState('')
  const [addingClub, setAddingClub] = useState(false)
  const [isPending, startTransition] = useTransition()

  const activityByDiv: Record<string, DivisionActivity> = {}
  for (const a of activities) activityByDiv[a.division_id] = a

  function handleAddClub() {
    if (!newClubName.trim()) return
    startTransition(async () => {
      const res = await addOpponentClub(newClubName.trim())
      if (res.club) {
        setClubs(prev => [...prev, { id: res.club!.id, name: res.club!.name, active: true, coordinator_name: null, coordinator_phone: null }])
        setNewClubName('')
        setAddingClub(false)
      }
    })
  }

  return (
    <div className="space-y-3">
      {divisions.map(div => (
        <DivisionRow
          key={div.id}
          date={date}
          division={div}
          activity={activityByDiv[div.id] ?? null}
          clubs={clubs}
          buses={buses}
          isPending={isPending}
          onAddClubNeeded={() => setAddingClub(true)}
        />
      ))}

      {/* Add club inline */}
      {addingClub && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-2 items-center">
          <input
            type="text"
            value={newClubName}
            onChange={e => setNewClubName(e.target.value)}
            placeholder="Nombre del club..."
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
            onKeyDown={e => e.key === 'Enter' && handleAddClub()}
            autoFocus
          />
          <button
            onClick={handleAddClub}
            disabled={isPending}
            className="px-3 py-1.5 bg-vrc-green text-white rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            Agregar
          </button>
          <button onClick={() => setAddingClub(false)} className="p-1.5 text-gray-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

// ── Per-division row ────────────────────────────────────────

interface RowProps {
  date: string
  division: { id: string; name: string }
  activity: DivisionActivity | null
  clubs: OpponentClub[]
  buses: EventBus[]
  isPending: boolean
  onAddClubNeeded: () => void
}

function DivisionRow({ date, division, activity, clubs, buses, isPending, onAddClubNeeded }: RowProps) {
  const [type, setType] = useState<'partido' | 'entrenamiento' | ''>(activity?.activity_type ?? '')
  const [venue, setVenue] = useState<'local' | 'visitante' | ''>(activity?.venue ?? '')
  const [clubId, setClubId] = useState(activity?.opponent_club_id ?? '')
  const [busId, setBusId] = useState(activity?.bus_id ?? '')
  const [locationNotes, setLocationNotes] = useState(activity?.location_notes ?? '')
  const [saved, setSaved] = useState(false)
  const [rowPending, startRow] = useTransition()

  function handleSave() {
    if (!type) return
    const fd = new FormData()
    fd.append('event_date', date)
    fd.append('division_id', division.id)
    fd.append('activity_type', type)
    if (venue) fd.append('venue', venue)
    if (clubId) fd.append('opponent_club_id', clubId)
    if (busId) fd.append('bus_id', busId)
    if (locationNotes) fd.append('location_notes', locationNotes)
    startRow(async () => {
      await saveDivisionActivity(fd)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  function handleDelete() {
    startRow(async () => {
      await deleteDivisionActivity(division.id, date)
      setType('')
      setVenue('')
      setClubId('')
      setBusId('')
      setLocationNotes('')
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      {/* Division name + delete */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-800">{division.name}</p>
        {activity && (
          <button onClick={handleDelete} disabled={rowPending} className="text-xs text-red-400 hover:text-red-600">
            Quitar
          </button>
        )}
      </div>

      {/* Activity type */}
      <div className="flex gap-2">
        {(['entrenamiento', 'partido'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setType(t); if (t === 'entrenamiento') { setVenue(''); setClubId('') } }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              type === t
                ? t === 'partido'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-600 border-gray-300'
            }`}
          >
            {t === 'partido' ? '🏉 Partido' : '🏃 Entrena'}
          </button>
        ))}
      </div>

      {/* Partido options */}
      {type === 'partido' && (
        <>
          {/* Venue */}
          <div className="flex gap-2">
            {(['local', 'visitante'] as const).map(v => (
              <button
                key={v}
                onClick={() => setVenue(v)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  venue === v
                    ? 'bg-gray-800 text-white border-gray-800'
                    : 'bg-white text-gray-600 border-gray-300'
                }`}
              >
                {VENUE_LABELS[v]}
              </button>
            ))}
          </div>

          {/* Opponent club */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Club rival</label>
            <div className="flex gap-2">
              <select
                value={clubId}
                onChange={e => setClubId(e.target.value)}
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
              >
                <option value="">Sin definir</option>
                {clubs.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={onAddClubNeeded}
                className="px-2 py-1.5 border border-gray-300 rounded-lg text-gray-500 hover:text-vrc-green text-xs"
              >
                + Club
              </button>
            </div>
          </div>
        </>
      )}

      {/* Location notes (any type) */}
      {type && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            {type === 'partido' ? 'Cancha / sede' : 'Nota'}
          </label>
          <input
            type="text"
            value={locationNotes}
            onChange={e => setLocationNotes(e.target.value)}
            placeholder={type === 'partido' ? 'ej: Cancha 2 de San Patricio' : 'opcional'}
            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
          />
        </div>
      )}

      {/* Bus */}
      {type && buses.length > 0 && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Bondi</label>
          <select
            value={busId}
            onChange={e => setBusId(e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
          >
            <option value="">Sin bondi</option>
            {buses.map(b => (
              <option key={b.id} value={b.id}>
                {b.label}{b.driver_phone ? ` — ${b.driver_phone}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Save button */}
      {type && (
        <button
          onClick={handleSave}
          disabled={rowPending || isPending}
          className={`w-full py-2 rounded-lg text-sm font-semibold transition-all ${
            saved
              ? 'bg-green-100 text-green-700'
              : 'bg-vrc-green hover:bg-green-800 text-white disabled:opacity-50'
          }`}
        >
          {rowPending ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar'}
        </button>
      )}
    </div>
  )
}
