'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import {
  saveDivisionActivity,
  deleteDivisionActivity,
  addOpponentClub,
} from '@/app/(app)/admin/sabados/actions'
import type { DivisionActivity, OpponentClub, OpponentClubFull, EventBus } from '@/lib/queries/sabados'

interface Division { id: string; name: string }

interface Props {
  date: string
  divisions: Division[]
  activities: DivisionActivity[]
  clubs: OpponentClubFull[]
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
        setClubs(prev => [...prev, {
          id: res.club!.id, name: res.club!.name, active: true,
          coordinator_name: null, coordinator_phone: null, coordinator_notes: null, venues: []
        }])
        setNewClubName('')
        setAddingClub(false)
      }
    })
  }

  return (
    <div className="space-y-3">
      {divisions.map(div => (
        <DivisionCard
          key={div.id}
          date={date}
          division={div}
          activity={activityByDiv[div.id] ?? null}
          clubs={clubs}
          buses={buses}
        />
      ))}

      {/* Add club */}
      {addingClub ? (
        <div className="flex gap-2 items-center bg-blue-50 border border-blue-200 rounded-xl p-3">
          <input
            autoFocus
            type="text"
            value={newClubName}
            onChange={e => setNewClubName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddClub()}
            placeholder="Nombre del club..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
          />
          <button onClick={handleAddClub} className="px-3 py-2 bg-vrc-green text-white rounded-lg text-sm font-semibold">
            Agregar
          </button>
          <button onClick={() => { setAddingClub(false); setNewClubName('') }} className="text-gray-400 text-sm px-1">
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAddingClub(true)}
          className="text-sm text-gray-400 hover:text-vrc-green px-1"
        >
          + Agregar club rival a la lista
        </button>
      )}
    </div>
  )
}

// ── MultiClubSelect — styled like native <select> ─────────────

function MultiClubSelect({
  clubs,
  selectedIds,
  onChange,
}: {
  clubs: OpponentClub[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const selectedNames = selectedIds
    .map(id => clubs.find(c => c.id === id)?.name)
    .filter(Boolean) as string[]

  const label =
    selectedNames.length === 0 ? 'Elegir rivales...'
    : selectedNames.length === 1 ? selectedNames[0]
    : `${selectedNames[0]} +${selectedNames.length - 1}`

  const selectedClubs = clubs.filter(c => selectedIds.includes(c.id))
  const otherClubs = clubs.filter(c => !selectedIds.includes(c.id))

  return (
    <div ref={ref} className="relative">
      {/* Trigger — mismo estilo que <select> nativo */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-vrc-green ${
          selectedIds.length > 0
            ? 'border-blue-300 text-blue-800 font-medium'
            : 'border-gray-300 text-gray-500'
        }`}
      >
        <span className="truncate">{label}</span>
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1">
          <p className="text-xs text-gray-400 px-3 pt-1 pb-1.5 border-b border-gray-100">Seleccioná los rivales</p>
          <div className="max-h-52 overflow-y-auto">
            {selectedClubs.map(c => (
              <label key={c.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 cursor-pointer bg-blue-50/50">
                <input
                  type="checkbox"
                  checked={true}
                  onChange={() => onChange(selectedIds.filter(id => id !== c.id))}
                  className="w-4 h-4 accent-green-700 flex-shrink-0"
                />
                <span className="text-sm text-gray-800 font-medium">{c.name}</span>
              </label>
            ))}
            {selectedClubs.length > 0 && otherClubs.length > 0 && (
              <div className="border-t border-gray-100 my-0.5" />
            )}
            {otherClubs.map(c => (
              <label key={c.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => onChange([...selectedIds, c.id])}
                  className="w-4 h-4 accent-green-700 flex-shrink-0"
                />
                <span className="text-sm text-gray-700">{c.name}</span>
              </label>
            ))}
          </div>
          <div className="border-t border-gray-100 px-3 py-2">
            <button onClick={() => setOpen(false)} className="text-sm font-semibold text-vrc-green">
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── VenueSelect ───────────────────────────────────────────────

function VenueSelect({
  clubs,
  selectedClubIds,
  value,
  onChange,
}: {
  clubs: OpponentClubFull[]
  selectedClubIds: string[]
  value: string
  onChange: (venueId: string) => void
}) {
  const selectedClubs = clubs.filter(c => selectedClubIds.includes(c.id) && c.venues.length > 0)
  const otherClubs = clubs.filter(c => !selectedClubIds.includes(c.id) && c.venues.length > 0)
  const venueLabel = (club: OpponentClubFull, v: typeof club.venues[0]) =>
    club.venues.length > 1 ? `${club.name} — ${v.name}` : club.name

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-vrc-green"
    >
      <option value="">Elegir sede...</option>
      {selectedClubs.map(club =>
        club.venues.map(v => (
          <option key={v.id} value={v.id}>{venueLabel(club, v)}</option>
        ))
      )}
      {selectedClubs.length > 0 && otherClubs.length > 0 && (
        <option disabled>──────────</option>
      )}
      {otherClubs.map(club =>
        club.venues.map(v => (
          <option key={v.id} value={v.id}>{venueLabel(club, v)}</option>
        ))
      )}
    </select>
  )
}

// ── Division card ─────────────────────────────────────────────

interface CardProps {
  date: string
  division: Division
  activity: DivisionActivity | null
  clubs: OpponentClubFull[]
  buses: EventBus[]
}

function DivisionCard({ date, division, activity, clubs, buses }: CardProps) {
  const [type, setType] = useState<'partido' | 'entrenamiento' | ''>(activity?.activity_type ?? '')
  const [opponentIds, setOpponentIds] = useState<string[]>(
    activity?.opponent_club_ids?.length ? activity.opponent_club_ids
    : activity?.opponent_club_id ? [activity.opponent_club_id]
    : []
  )
  const [venue, setVenue] = useState<'local' | 'visitante' | ''>(activity?.venue ?? '')
  const [locationVenueId, setLocationVenueId] = useState(activity?.location_venue_id ?? '')
  const [busId, setBusId] = useState(activity?.bus_id ?? '')
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function save(
    overrides: Partial<{
      t: typeof type
      opps: string[]
      v: typeof venue
      locVenue: string
      bus: string
    }> = {}
  ) {
    const t = overrides.t ?? type
    if (!t) return
    const fd = new FormData()
    fd.append('event_date', date)
    fd.append('division_id', division.id)
    fd.append('activity_type', t)
    const v = overrides.v ?? venue
    const opps = overrides.opps ?? opponentIds
    const locVenue = overrides.locVenue ?? locationVenueId
    const bus = overrides.bus ?? busId
    if (t === 'partido') {
      if (v) fd.append('venue', v)
      for (const id of opps) fd.append('opponent_club_id', id)
      if (locVenue) fd.append('location_venue_id', locVenue)
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
    if (t === 'entrenamiento') { setOpponentIds([]); setVenue(''); setLocationVenueId('') }
    save({ t, opps: t === 'entrenamiento' ? [] : opponentIds })
  }

  function handleVenue(v: 'local' | 'visitante') {
    setVenue(v)
    if (v === 'local') setLocationVenueId('')
    save({ v, locVenue: v === 'local' ? '' : locationVenueId })
  }

  function handleOpponents(ids: string[]) {
    setOpponentIds(ids)
    save({ opps: ids })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteDivisionActivity(division.id, date)
      setType('')
      setVenue('')
      setOpponentIds([])
      setLocationVenueId('')
      setBusId('')
    })
  }

  const isPartido = type === 'partido'

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="font-bold text-gray-900">{division.name}</span>
        <div className="flex items-center gap-2">
          {isPending && <span className="text-xs text-gray-400">Guardando…</span>}
          {saved && !isPending && <span className="text-xs text-green-600 font-medium">✓ Guardado</span>}
          {type && !isPending && !saved && (
            <button onClick={handleDelete} className="text-gray-300 hover:text-red-400 p-1" title="Borrar actividad">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="px-4 py-3 space-y-3">
        {/* Activity type — segmented control */}
        <div className="flex gap-2">
          <button
            onClick={() => handleType('entrenamiento')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              type === 'entrenamiento'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            Entrenamiento
          </button>
          <button
            onClick={() => handleType('partido')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              type === 'partido'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            Partido
          </button>
        </div>

        {/* Partido fields */}
        {isPartido && (
          <>
            {/* Rivals */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Rivales</label>
              <MultiClubSelect
                clubs={clubs}
                selectedIds={opponentIds}
                onChange={handleOpponents}
              />
            </div>

            {/* Local / Visitante */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Sede</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleVenue('local')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    venue === 'local'
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  Local
                </button>
                <button
                  onClick={() => handleVenue('visitante')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    venue === 'visitante'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  Visitante
                </button>
              </div>
            </div>

            {/* Venue (visitante only) */}
            {venue === 'visitante' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Dónde jugamos</label>
                <VenueSelect
                  clubs={clubs}
                  selectedClubIds={opponentIds}
                  value={locationVenueId}
                  onChange={(id) => { setLocationVenueId(id); save({ locVenue: id }) }}
                />
              </div>
            )}
          </>
        )}

        {/* Bus */}
        {type && buses.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Bondi</label>
            <select
              value={busId}
              onChange={e => { setBusId(e.target.value); save({ bus: e.target.value }) }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-vrc-green"
            >
              <option value="">Sin bondi asignado</option>
              {buses.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
          </div>
        )}
      </div>
    </div>
  )
}
