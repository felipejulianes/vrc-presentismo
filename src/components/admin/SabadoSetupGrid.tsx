'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { saveDivisionActivity } from '@/app/(app)/admin/sabados/actions'
import type { DivisionActivity, OpponentClub, OpponentClubFull, EventBus } from '@/lib/queries/sabados'

interface Division { id: string; name: string }

interface Props {
  date: string
  divisions: Division[]
  activities: DivisionActivity[]
  clubs: OpponentClubFull[]
  buses: EventBus[]
}

// ── Helpers ──────────────────────────────────────────────────

function sameIds(a: string[], b: string[]) {
  return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort())
}

function detectGlobalState(activities: DivisionActivity[], divisions: Division[]) {
  if (activities.length === 0 || activities.length < divisions.length) return null
  const first = activities[0]
  const allSameType = activities.every(a => a.activity_type === first.activity_type)
  const firstOpps = first.opponent_club_ids ?? []
  const allSameOpps = activities.every(a => sameIds(a.opponent_club_ids ?? [], firstOpps))
  if (!allSameType) return null
  return {
    type: first.activity_type,
    opponentIds: allSameOpps ? firstOpps : [] as string[],
  }
}

// ── Root component ────────────────────────────────────────────

export function SabadoSetupGrid({ date, divisions, activities: initialActivities, clubs, buses }: Props) {
  const [activities, setActivities] = useState(initialActivities)

  const anyPartido = activities.some(a => a.activity_type === 'partido')

  function handleActivityChange(divisionId: string, updated: DivisionActivity | null) {
    setActivities(prev => {
      const next = prev.filter(a => a.division_id !== divisionId)
      return updated ? [...next, updated] : next
    })
  }

  return (
    <div className="space-y-4">
      {/* ① Global setup */}
      <GlobalSetup
        date={date}
        divisions={divisions}
        activities={activities}
        clubs={clubs}
        onApplied={setActivities}
      />

      {/* ② Localía por división */}
      {anyPartido && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
            Localía por división
          </p>
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {divisions.map(div => {
              const activity = activities.find(a => a.division_id === div.id) ?? null
              return (
                <VenueRow
                  key={div.id}
                  date={date}
                  division={div}
                  activity={activity}
                  clubs={clubs}
                  buses={buses}
                  onChange={(updated) => handleActivityChange(div.id, updated)}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── GlobalSetup ───────────────────────────────────────────────

function GlobalSetup({
  date, divisions, activities, clubs, onApplied,
}: {
  date: string
  divisions: Division[]
  activities: DivisionActivity[]
  clubs: OpponentClubFull[]
  onApplied: (acts: DivisionActivity[]) => void
}) {
  const detected = detectGlobalState(activities, divisions)

  const [type, setType] = useState<'partido' | 'entrenamiento' | ''>(detected?.type ?? '')
  const [opponentIds, setOpponentIds] = useState<string[]>(detected?.opponentIds ?? [])
  const [applying, setApplying] = useState(false)
  const [appliedCount, setAppliedCount] = useState(0)
  const [appliedOk, setAppliedOk] = useState(false)
  const router = useRouter()

  const configuredCount = activities.length
  const canApply = type !== ''
  const isPartido = type === 'partido'

  async function handleApplyAll() {
    if (!canApply) return
    setApplying(true)
    setAppliedCount(0)
    const updated: DivisionActivity[] = []

    for (const div of divisions) {
      const existing = activities.find(a => a.division_id === div.id)
      const fd = new FormData()
      fd.append('event_date', date)
      fd.append('division_id', div.id)
      fd.append('activity_type', type)
      if (type === 'partido') {
        for (const id of opponentIds) fd.append('opponent_club_id', id)
        // Preserve existing venue/bus
        if (existing?.venue) fd.append('venue', existing.venue)
        if (existing?.location_venue_id) fd.append('location_venue_id', existing.location_venue_id)
        if (existing?.bus_id) fd.append('bus_id', existing.bus_id)
      }
      await saveDivisionActivity(fd)
      // Build optimistic updated activity
      updated.push({
        ...(existing ?? {
          id: crypto.randomUUID(),
          activity_date: date,
          division_id: div.id,
          opponent_club_id: opponentIds[0] ?? null,
          opponent_club_name: null,
          opponent_club_ids: opponentIds,
          location_club_id: null,
          location_club_name: null,
          location_notes: null,
          location_venue_id: null,
          location_venue_name: null,
          location_venue_address: null,
          location_venue_maps_url: null,
          bus_id: null,
          bus_label: null,
          bus_driver_phone: null,
          bus_patente: null,
          venue: null,
        }),
        activity_type: type as 'partido' | 'entrenamiento',
        opponent_club_ids: opponentIds,
        opponent_club_id: opponentIds[0] ?? null,
      })
      setAppliedCount(c => c + 1)
    }

    onApplied(updated)
    setApplying(false)
    setAppliedOk(true)
    router.refresh()
    setTimeout(() => setAppliedOk(false), 2500)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-700">Para todas las divisiones</p>
        <span className="text-xs text-gray-400">
          {configuredCount}/{divisions.length} configuradas
        </span>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Tipo */}
        <div className="flex gap-2">
          <button
            onClick={() => { setType('entrenamiento'); setOpponentIds([]) }}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
              type === 'entrenamiento'
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            🏃 Entrenamiento
          </button>
          <button
            onClick={() => setType('partido')}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
              type === 'partido'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            🏉 Partido
          </button>
        </div>

        {/* Rivales */}
        {isPartido && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Rivales (compartidos por todas)</label>
            <MultiClubSelect
              clubs={clubs}
              selectedIds={opponentIds}
              onChange={setOpponentIds}
            />
          </div>
        )}

        {/* Apply button */}
        {type && (
          <button
            onClick={handleApplyAll}
            disabled={applying}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
              appliedOk
                ? 'bg-green-600 text-white'
                : 'bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white'
            }`}
          >
            {applying ? (
              <>
                <span className="animate-spin text-base">⟳</span>
                Aplicando {appliedCount}/{divisions.length}...
              </>
            ) : appliedOk ? (
              '✓ Aplicado'
            ) : (
              `Aplicar a las ${divisions.length} divisiones ↓`
            )}
          </button>
        )}

        {!type && (
          <p className="text-xs text-gray-400 text-center py-1">
            Elegí entrenamiento o partido para configurar todas las divisiones a la vez
          </p>
        )}
      </div>
    </div>
  )
}

// ── VenueRow — fila compacta de localía por división ──────────

interface VenueRowProps {
  date: string
  division: Division
  activity: DivisionActivity | null
  clubs: OpponentClubFull[]
  buses: EventBus[]
  onChange: (updated: DivisionActivity | null) => void
}

function VenueRow({ date, division, activity, clubs, buses, onChange }: VenueRowProps) {
  const [venue, setVenue] = useState<'local' | 'visitante' | ''>(activity?.venue ?? '')
  const [locationVenueId, setLocationVenueId] = useState(activity?.location_venue_id ?? '')
  const [busId, setBusId] = useState(activity?.bus_id ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showAllVenues, setShowAllVenues] = useState(false)

  // Override individual por división
  const [showOverride, setShowOverride] = useState(false)
  const [overrideType, setOverrideType] = useState<'partido' | 'entrenamiento'>(activity?.activity_type ?? 'entrenamiento')
  const [overrideOpponentIds, setOverrideOpponentIds] = useState<string[]>(activity?.opponent_club_ids ?? [])
  const [savingOverride, setSavingOverride] = useState(false)

  async function save(overrides: { v?: typeof venue; locVenue?: string; bus?: string; type?: string; oppIds?: string[] } = {}) {
    const v = overrides.v ?? venue
    const locVenue = overrides.locVenue ?? locationVenueId
    const bus = overrides.bus ?? busId
    const type = overrides.type ?? overrideType
    const oppIds = overrides.oppIds ?? overrideOpponentIds
    setSaving(true)
    const fd = new FormData()
    fd.append('event_date', date)
    fd.append('division_id', division.id)
    fd.append('activity_type', type)
    if (type === 'partido') {
      for (const id of oppIds) fd.append('opponent_club_id', id)
      if (v) fd.append('venue', v)
      if (v === 'visitante' && locVenue) fd.append('location_venue_id', locVenue)
    }
    if (bus) fd.append('bus_id', bus)
    await saveDivisionActivity(fd)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
    onChange({ ...(activity ?? {
      id: crypto.randomUUID(),
      activity_date: date,
      division_id: division.id,
      opponent_club_id: null,
      opponent_club_name: null,
      opponent_club_ids: [],
      location_club_id: null,
      location_club_name: null,
      location_notes: null,
      location_venue_id: null,
      location_venue_name: null,
      location_venue_address: null,
      location_venue_maps_url: null,
      bus_id: null,
      bus_label: null,
      bus_driver_phone: null,
      bus_patente: null,
      venue: null,
    }), activity_type: type as 'partido' | 'entrenamiento', opponent_club_ids: oppIds, venue: v as 'local' | 'visitante' | null, location_venue_id: locVenue || null, bus_id: bus || null })
  }

  async function saveOverride() {
    setSavingOverride(true)
    await save({ type: overrideType, oppIds: overrideOpponentIds, v: overrideType === 'entrenamiento' ? '' : venue })
    setSavingOverride(false)
    setShowOverride(false)
  }

  function handleVenue(v: 'local' | 'visitante') {
    setVenue(v)
    if (v === 'local') { setLocationVenueId(''); save({ v, locVenue: '' }) }
    else save({ v })
  }

  const opponentIds = overrideOpponentIds
  const relevantClubs = clubs.filter(c => opponentIds.includes(c.id) && c.venues.length > 0)
  const otherClubs = clubs.filter(c => !opponentIds.includes(c.id) && c.venues.length > 0)
  const isPartido = overrideType === 'partido'

  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-center gap-3">
        {/* División name */}
        <span className="w-16 text-sm font-bold text-gray-800 flex-shrink-0">{division.name}</span>

        {overrideType === 'entrenamiento' ? (
          <span className="flex-1 text-xs text-gray-400 italic">Entrena</span>
        ) : (
          /* Local / Visitante toggle */
          <div className="flex gap-1.5 flex-1">
            <button
              onClick={() => handleVenue('local')}
              disabled={saving}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                venue === 'local' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              Local
            </button>
            <button
              onClick={() => handleVenue('visitante')}
              disabled={saving}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                venue === 'visitante' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              Visita
            </button>
          </div>
        )}

        {/* Bondi */}
        {buses.length > 0 && (
          <select
            value={busId}
            onChange={e => { setBusId(e.target.value); save({ bus: e.target.value }) }}
            className="w-28 px-2 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-600"
          >
            <option value="">🚌 —</option>
            {buses.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
        )}

        {/* Override toggle + status */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {saving && <span className="text-xs text-gray-400">...</span>}
          {saved && !saving && <span className="text-xs text-green-600">✓</span>}
          <button
            onClick={() => setShowOverride(v => !v)}
            className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
              showOverride
                ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'
            }`}
            title="Configuración diferente para esta división"
          >
            ✎
          </button>
        </div>
      </div>

      {/* Sede visitante */}
      {isPartido && venue === 'visitante' && !showOverride && (
        <div className="pl-[76px] space-y-1">
          <select
            value={locationVenueId}
            onChange={e => { setLocationVenueId(e.target.value); save({ locVenue: e.target.value }) }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white text-gray-700"
          >
            <option value="">Elegir sede...</option>
            {relevantClubs.map(club =>
              club.venues.map(v => (
                <option key={v.id} value={v.id}>
                  {club.venues.length > 1 ? `${club.name} — ${v.name}` : club.name}
                </option>
              ))
            )}
            {showAllVenues && relevantClubs.length > 0 && otherClubs.length > 0 && (
              <option disabled>──────────</option>
            )}
            {showAllVenues && otherClubs.map(club =>
              club.venues.map(v => (
                <option key={v.id} value={v.id}>
                  {club.venues.length > 1 ? `${club.name} — ${v.name}` : club.name}
                </option>
              ))
            )}
          </select>
          {!showAllVenues && otherClubs.length > 0 && (
            <button
              onClick={() => setShowAllVenues(true)}
              className="text-xs text-gray-400 underline"
            >
              Ver todas las sedes ({otherClubs.length} más)
            </button>
          )}
        </div>
      )}

      {/* Panel de override individual */}
      {showOverride && (
        <div className="ml-[76px] p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
          <p className="text-xs font-semibold text-amber-700">Configuración solo para {division.name}</p>
          <div className="flex gap-2">
            <button
              onClick={() => { setOverrideType('entrenamiento'); setOverrideOpponentIds([]) }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                overrideType === 'entrenamiento' ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-500'
              }`}
            >
              🏃 Entrena
            </button>
            <button
              onClick={() => setOverrideType('partido')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                overrideType === 'partido' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-500'
              }`}
            >
              🏉 Partido
            </button>
          </div>
          {overrideType === 'partido' && (
            <MultiClubSelect clubs={clubs} selectedIds={overrideOpponentIds} onChange={setOverrideOpponentIds} />
          )}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setShowOverride(false)}
              className="flex-1 py-2 text-xs rounded-lg bg-white border border-gray-200 text-gray-500"
            >
              Cancelar
            </button>
            <button
              onClick={saveOverride}
              disabled={savingOverride}
              className="flex-1 py-2 text-xs rounded-lg bg-amber-600 text-white font-semibold disabled:opacity-50"
            >
              {savingOverride ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── MultiClubSelect ───────────────────────────────────────────

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
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) { setSearch(''); return }
    setTimeout(() => searchRef.current?.focus(), 0)
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const selectedNames = selectedIds.map(id => clubs.find(c => c.id === id)?.name).filter(Boolean) as string[]
  const label = selectedNames.length === 0 ? 'Elegir rivales...'
    : selectedNames.length === 1 ? selectedNames[0]
    : `${selectedNames[0]} +${selectedNames.length - 1}`

  const selectedClubs = clubs.filter(c => selectedIds.includes(c.id))
  const q = search.toLowerCase().trim()
  const otherClubs = clubs.filter(c => !selectedIds.includes(c.id) && (q === '' || c.name.toLowerCase().includes(q)))

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between px-3 py-2.5 border rounded-xl text-sm bg-white focus:outline-none ${
          selectedIds.length > 0 ? 'border-blue-300 text-blue-800 font-medium' : 'border-gray-300 text-gray-500'
        }`}
      >
        <span className="truncate">{label}</span>
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="px-3 pt-2.5 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2 px-2.5 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar club..."
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-gray-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {selectedClubs.map(c => (
              <label key={c.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 cursor-pointer bg-blue-50/50">
                <input type="checkbox" checked onChange={() => onChange(selectedIds.filter(id => id !== c.id))} className="w-4 h-4 accent-green-700 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-800">{c.name}</span>
              </label>
            ))}
            {selectedClubs.length > 0 && otherClubs.length > 0 && <div className="border-t border-gray-100 my-0.5" />}
            {otherClubs.map(c => (
              <label key={c.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={false} onChange={() => onChange([...selectedIds, c.id])} className="w-4 h-4 accent-green-700 flex-shrink-0" />
                <span className="text-sm text-gray-700">{c.name}</span>
              </label>
            ))}
            {otherClubs.length === 0 && selectedClubs.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Sin resultados</p>
            )}
          </div>
          <div className="border-t border-gray-100 px-3 py-2">
            <button onClick={() => setOpen(false)} className="text-sm font-semibold text-vrc-green">Listo</button>
          </div>
        </div>
      )}
    </div>
  )
}
