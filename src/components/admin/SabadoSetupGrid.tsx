'use client'

import { useState, useTransition } from 'react'
import {
  saveDivisionActivity,
  deleteDivisionActivity,
  addOpponentClub,
} from '@/app/(app)/admin/sabados/actions'
import type { DivisionActivity, OpponentClub, EventBus } from '@/lib/queries/sabados'

interface Division { id: string; name: string }

interface Props {
  date: string
  divisions: Division[]
  activities: DivisionActivity[]
  clubs: OpponentClub[]
  buses: EventBus[]
}

export function SabadoSetupGrid({ date, divisions, activities, clubs: initialClubs, buses }: Props) {
  const [clubs, setClubs] = useState(initialClubs)
  const [addingClub, setAddingClub] = useState(false)
  const [newClubName, setNewClubName] = useState('')
  const [, startGlobal] = useTransition()

  const activityByDiv: Record<string, DivisionActivity> = {}
  for (const a of activities) activityByDiv[a.division_id] = a

  function handleAddClub() {
    if (!newClubName.trim()) return
    startGlobal(async () => {
      const res = await addOpponentClub(newClubName.trim())
      if (res.club) {
        setClubs(prev => [...prev, { id: res.club!.id, name: res.club!.name, active: true }])
        setNewClubName('')
        setAddingClub(false)
      }
    })
  }

  return (
    <div className="space-y-2">
      {/* Compact grid header */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[500px]">
          <thead>
            <tr className="text-gray-400 uppercase tracking-wide border-b border-gray-200">
              <th className="text-left py-1.5 pl-1 w-14">Div.</th>
              <th className="text-center py-1.5 w-28">Actividad</th>
              <th className="text-left py-1.5 px-2">Rival</th>
              <th className="text-center py-1.5 w-20">Sede</th>
              <th className="text-left py-1.5 px-2">Dónde</th>
              <th className="text-left py-1.5 px-2">Bondi</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {divisions.map(div => (
              <GridRow
                key={div.id}
                date={date}
                division={div}
                activity={activityByDiv[div.id] ?? null}
                clubs={clubs}
                buses={buses}
                onNeedClub={() => setAddingClub(true)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Add club */}
      {addingClub ? (
        <div className="flex gap-2 items-center bg-blue-50 border border-blue-200 rounded-xl p-2">
          <input
            autoFocus
            type="text"
            value={newClubName}
            onChange={e => setNewClubName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddClub()}
            placeholder="Nombre del club..."
            className="flex-1 px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
          />
          <button
            onClick={handleAddClub}
            className="px-3 py-1 bg-vrc-green text-white rounded-lg text-xs font-semibold"
          >
            Agregar
          </button>
          <button onClick={() => { setAddingClub(false); setNewClubName('') }} className="text-gray-400 text-xs">
            Cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAddingClub(true)}
          className="text-xs text-gray-400 hover:text-vrc-green px-1"
        >
          + Agregar club rival
        </button>
      )}
    </div>
  )
}

// ── Grid row per division ───────────────────────────────────

interface RowProps {
  date: string
  division: Division
  activity: DivisionActivity | null
  clubs: OpponentClub[]
  buses: EventBus[]
  onNeedClub: () => void
}

function GridRow({ date, division, activity, clubs, buses, onNeedClub }: RowProps) {
  const [type, setType] = useState<'partido' | 'entrenamiento' | ''>(activity?.activity_type ?? '')
  const [opponentId, setOpponentId] = useState(activity?.opponent_club_id ?? '')
  const [venue, setVenue] = useState<'local' | 'visitante' | ''>(activity?.venue ?? '')
  const [locationId, setLocationId] = useState(activity?.location_club_id ?? '')
  const [busId, setBusId] = useState(activity?.bus_id ?? '')
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function save(
    overrides: Partial<{
      t: typeof type; opp: string; v: typeof venue; loc: string; bus: string
    }> = {}
  ) {
    const t = overrides.t ?? type
    if (!t) return
    const fd = new FormData()
    fd.append('event_date', date)
    fd.append('division_id', division.id)
    fd.append('activity_type', t)
    const v = overrides.v ?? venue
    const opp = overrides.opp ?? opponentId
    const loc = overrides.loc ?? locationId
    const bus = overrides.bus ?? busId
    if (t === 'partido') {
      if (v) fd.append('venue', v)
      if (opp) fd.append('opponent_club_id', opp)
      if (loc) fd.append('location_club_id', loc)
    }
    if (bus) fd.append('bus_id', bus)
    startTransition(async () => {
      await saveDivisionActivity(fd)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    })
  }

  function handleType(t: 'partido' | 'entrenamiento') {
    setType(t)
    if (t === 'entrenamiento') { setOpponentId(''); setVenue(''); setLocationId('') }
    save({ t })
  }

  function handleVenue(v: 'local' | 'visitante') {
    setVenue(v)
    if (v === 'local') setLocationId('')
    save({ v })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteDivisionActivity(division.id, date)
      setType('')
      setVenue('')
      setOpponentId('')
      setLocationId('')
      setBusId('')
    })
  }

  const isPartido = type === 'partido'

  return (
    <tr className="border-b border-gray-100 last:border-0">
      {/* Division name */}
      <td className="py-2 pl-1 font-semibold text-gray-800 text-xs">{division.name}</td>

      {/* Activity type */}
      <td className="py-2 px-1">
        <div className="flex gap-1">
          <button
            onClick={() => handleType('entrenamiento')}
            className={`px-1.5 py-0.5 rounded text-xs font-medium transition-all ${type === 'entrenamiento' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            Entrena
          </button>
          <button
            onClick={() => handleType('partido')}
            className={`px-1.5 py-0.5 rounded text-xs font-medium transition-all ${type === 'partido' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            Partido
          </button>
        </div>
      </td>

      {/* Rival */}
      <td className="py-2 px-1">
        {isPartido ? (
          <div className="flex gap-1 items-center">
            <select
              value={opponentId}
              onChange={e => { setOpponentId(e.target.value); save({ opp: e.target.value }) }}
              className="flex-1 px-1.5 py-0.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-vrc-green min-w-[80px]"
            >
              <option value="">—</option>
              {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={onNeedClub} className="text-gray-400 hover:text-vrc-green text-xs">+</button>
          </div>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </td>

      {/* Local/Visitante */}
      <td className="py-2 px-1">
        {isPartido ? (
          <div className="flex gap-1">
            <button
              onClick={() => handleVenue('local')}
              className={`px-1.5 py-0.5 rounded text-xs font-medium transition-all ${venue === 'local' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              Local
            </button>
            <button
              onClick={() => handleVenue('visitante')}
              className={`px-1.5 py-0.5 rounded text-xs font-medium transition-all ${venue === 'visitante' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              Visit.
            </button>
          </div>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </td>

      {/* Dónde (sede) — only visible if partido visitante */}
      <td className="py-2 px-1">
        {isPartido && venue === 'visitante' ? (
          <select
            value={locationId}
            onChange={e => { setLocationId(e.target.value); save({ loc: e.target.value }) }}
            className="w-full px-1.5 py-0.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-vrc-green min-w-[80px]"
          >
            <option value="">Club?</option>
            {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        ) : (
          <span className="text-xs text-gray-300">{isPartido && venue === 'local' ? 'VRC' : '—'}</span>
        )}
      </td>

      {/* Bondi */}
      <td className="py-2 px-1">
        {type && buses.length > 0 ? (
          <select
            value={busId}
            onChange={e => { setBusId(e.target.value); save({ bus: e.target.value }) }}
            className="w-full px-1.5 py-0.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-vrc-green min-w-[70px]"
          >
            <option value="">—</option>
            {buses.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
        ) : (
          <span className="text-gray-300 text-xs">—</span>
        )}
      </td>

      {/* Status/delete */}
      <td className="py-2 text-right pr-1">
        {isPending ? (
          <span className="text-xs text-gray-400">…</span>
        ) : saved ? (
          <span className="text-xs text-green-600">✓</span>
        ) : type ? (
          <button onClick={handleDelete} className="text-xs text-gray-300 hover:text-red-400">✕</button>
        ) : null}
      </td>
    </tr>
  )
}
