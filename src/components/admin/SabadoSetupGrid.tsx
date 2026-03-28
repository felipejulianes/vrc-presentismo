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

      {/* ② Localía — kanban responsive */}
      {anyPartido && (
        <VenueKanban
          date={date}
          divisions={divisions}
          activities={activities}
          clubs={clubs}
          buses={buses}
          onActivityChange={handleActivityChange}
        />
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
            ⚽ Partido
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

// ── VenueKanban — asignador de sedes responsive ───────────────

type Bucket = {
  key: string
  label: string
  icon: string
  address?: string | null
  mapsUrl?: string | null
  venueId?: string | null
}

const EMPTY_ACTIVITY_BASE = {
  opponent_club_id: null,
  opponent_club_name: null,
  opponent_club_ids: [] as string[],
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
  venue: null as 'local' | 'visitante' | null,
}

function VenueKanban({
  date, divisions, activities, clubs, buses, onActivityChange,
}: {
  date: string
  divisions: Division[]
  activities: DivisionActivity[]
  clubs: OpponentClubFull[]
  buses: EventBus[]
  onActivityChange: (divisionId: string, updated: DivisionActivity | null) => void
}) {
  // Compute unique opponent clubs across all activities
  const _allIds = activities.flatMap(a => a.opponent_club_ids ?? [])
  const allOpponentIds = _allIds.filter((id, i) => _allIds.indexOf(id) === i)
  const opponentClubs = clubs.filter(c => allOpponentIds.includes(c.id))

  // Build buckets: Sin partido + Local + one per rival venue
  const buckets: Bucket[] = [
    { key: 'no_game', label: 'Sin confirmar', icon: '⏳' },
    { key: 'local',   label: 'Local',        icon: '🏠' },
    ...opponentClubs.flatMap(club =>
      club.venues.map(v => ({
        key: `venue_${v.id}`,
        label: club.venues.length > 1 ? `${club.name} — ${v.name}` : club.name,
        icon: '✈️',
        address: v.address,
        mapsUrl: v.maps_url,
        venueId: v.id,
      }))
    ),
  ]

  function getBucketKey(divId: string): string {
    const act = activities.find(a => a.division_id === divId)
    if (!act || act.activity_type === 'entrenamiento' || !act.venue) return 'no_game'
    if (act.venue === 'local') return 'local'
    if (act.location_venue_id) return `venue_${act.location_venue_id}`
    return 'no_game'
  }

  const [assignments, setAssignments] = useState<Record<string, string>>(() =>
    Object.fromEntries(divisions.map(d => [d.id, getBucketKey(d.id)]))
  )
  const [busAssignments, setBusAssignments] = useState<Record<string, string>>(() =>
    Object.fromEntries(divisions.map(d => [d.id, activities.find(a => a.division_id === d.id)?.bus_id ?? '']))
  )
  const [selectedDivId, setSelectedDivId] = useState<string | null>(null)
  const [saving, setSaving] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setSelectedDivId(null)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // Sync assignments when activities change externally (e.g. after GlobalSetup apply)
  useEffect(() => {
    setAssignments(Object.fromEntries(divisions.map(d => [d.id, getBucketKey(d.id)])))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities])

  async function moveDivision(divId: string, bucketKey: string) {
    setAssignments(prev => ({ ...prev, [divId]: bucketKey }))
    setSelectedDivId(null)
    setSaving(prev => [...prev, divId])

    const activity = activities.find(a => a.division_id === divId)
    const fd = new FormData()
    fd.append('event_date', date)
    fd.append('division_id', divId)

    if (bucketKey === 'no_game') {
      fd.append('activity_type', 'entrenamiento')
    } else {
      fd.append('activity_type', 'partido')
      for (const id of activity?.opponent_club_ids ?? []) fd.append('opponent_club_id', id)
      if (bucketKey === 'local') {
        fd.append('venue', 'local')
      } else {
        fd.append('venue', 'visitante')
        fd.append('location_venue_id', bucketKey.replace('venue_', ''))
      }
    }
    if (busAssignments[divId]) fd.append('bus_id', busAssignments[divId])

    await saveDivisionActivity(fd)
    setSaving(prev => prev.filter(id => id !== divId))

    const base = activity ?? { id: crypto.randomUUID(), activity_date: date, division_id: divId, ...EMPTY_ACTIVITY_BASE }
    onActivityChange(divId, {
      ...base,
      activity_type: bucketKey === 'no_game' ? 'entrenamiento' : 'partido',
      venue: bucketKey === 'local' ? 'local' : bucketKey === 'no_game' ? null : 'visitante',
      location_venue_id: bucketKey.startsWith('venue_') ? bucketKey.replace('venue_', '') : null,
    } as DivisionActivity)
  }

  async function saveBus(divId: string, busId: string) {
    setBusAssignments(prev => ({ ...prev, [divId]: busId }))
    const activity = activities.find(a => a.division_id === divId)
    if (!activity) return
    const fd = new FormData()
    fd.append('event_date', date)
    fd.append('division_id', divId)
    fd.append('activity_type', activity.activity_type)
    for (const id of activity.opponent_club_ids ?? []) fd.append('opponent_club_id', id)
    if (activity.venue) fd.append('venue', activity.venue)
    if (activity.location_venue_id) fd.append('location_venue_id', activity.location_venue_id)
    if (busId) fd.append('bus_id', busId)
    await saveDivisionActivity(fd)
  }

  // Group divisions by bucket key
  const divsByBucket: Record<string, Division[]> = Object.fromEntries(buckets.map(b => [b.key, []]))
  for (const div of divisions) {
    const key = assignments[div.id] ?? 'no_game'
    ;(divsByBucket[key] ?? divsByBucket['no_game']).push(div)
  }

  return (
    <div className="space-y-3" ref={containerRef}>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">Localía</p>

      {/* Kanban: columna en mobile, grid en desktop */}
      <div
        className="flex flex-col gap-3 md:grid"
        style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }}
      >
        {buckets.map(bucket => {
          const isNoGame = bucket.key === 'no_game'
          const isLocal = bucket.key === 'local'
          const bgClass = isNoGame ? 'bg-gray-50 border-gray-200' : isLocal ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
          const labelClass = isNoGame ? 'text-gray-500' : isLocal ? 'text-green-700' : 'text-orange-700'

          return (
            <div key={bucket.key} className={`rounded-xl border p-3 space-y-2 min-h-[72px] ${bgClass}`}>
              {/* Header */}
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-base flex-shrink-0">{bucket.icon}</span>
                  <span className={`text-xs font-semibold truncate ${labelClass}`}>{bucket.label}</span>
                </div>
                {bucket.mapsUrl && (
                  <a href={bucket.mapsUrl} target="_blank" rel="noopener noreferrer"
                    className="text-base flex-shrink-0" title={bucket.address ?? ''}>
                    📍
                  </a>
                )}
              </div>

              {/* Chips */}
              <div className="flex flex-wrap gap-1.5">
                {divsByBucket[bucket.key]?.map(div => {
                  const isSelected = selectedDivId === div.id
                  const isSaving = saving.includes(div.id)
                  const chipClass = isSaving
                    ? 'opacity-50 cursor-wait bg-gray-200 text-gray-500'
                    : isSelected
                      ? 'ring-2 ring-blue-400 bg-blue-100 text-blue-800'
                      : isNoGame
                        ? 'bg-white border border-gray-300 text-gray-500 hover:border-gray-400'
                        : isLocal
                          ? 'bg-green-700 text-white hover:bg-green-800'
                          : 'bg-orange-500 text-white hover:bg-orange-600'

                  return (
                    <div key={div.id} className="relative">
                      <button
                        onClick={() => setSelectedDivId(isSelected ? null : div.id)}
                        disabled={isSaving}
                        className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all ${chipClass}`}
                      >
                        {isSaving ? '…' : div.name}
                      </button>

                      {/* Popover de destinos */}
                      {isSelected && (
                        <div className="absolute top-full left-0 z-30 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl min-w-[190px] overflow-hidden">
                          <p className="text-xs text-gray-400 px-3 pt-2.5 pb-1.5">Mover {div.name} a…</p>
                          {buckets.filter(b => b.key !== bucket.key).map(b => (
                            <button key={b.key} onClick={() => moveDivision(div.id, b.key)}
                              className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2.5 border-t border-gray-50">
                              <span className="text-base">{b.icon}</span>
                              <span className="font-medium text-gray-700">{b.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
                {divsByBucket[bucket.key]?.length === 0 && (
                  <p className="text-xs text-gray-300 italic py-1">Ninguna</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bondis — solo divisiones con partido */}
      {buses.length > 0 && divisions.some(d => assignments[d.id] !== 'no_game') && (
        <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Bondis</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {divisions.filter(d => assignments[d.id] !== 'no_game').map(div => (
              <div key={div.id} className="flex items-center gap-2">
                <span className="w-12 text-xs font-bold text-gray-700 flex-shrink-0">{div.name}</span>
                <select
                  value={busAssignments[div.id] ?? ''}
                  onChange={e => saveBus(div.id, e.target.value)}
                  className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white text-gray-600"
                >
                  <option value="">🚌 Sin bondi</option>
                  {buses.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.label}{b.patente ? ` (${b.patente})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ))}
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
