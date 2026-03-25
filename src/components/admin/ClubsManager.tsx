'use client'

import { useState, useTransition } from 'react'
import {
  addOpponentClub, toggleClubActive,
  updateClubCoordinator, addVenue, updateVenue, deleteVenue,
} from '@/app/(app)/admin/sabados/actions'
import type { OpponentClubFull, ClubVenue } from '@/lib/queries/sabados'

interface Props {
  initialClubs: OpponentClubFull[]
}

function formatWhatsApp(phone: string): string {
  // Argentine format: remove spaces, dashes, +
  const digits = phone.replace(/\D/g, '')
  // If starts with 0, remove it; add 549 prefix
  if (digits.startsWith('549')) return digits
  if (digits.startsWith('54')) return digits
  if (digits.startsWith('0')) return '549' + digits.slice(1)
  return '549' + digits
}

export function ClubsManager({ initialClubs }: Props) {
  const [clubs, setClubs] = useState(initialClubs)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleAdd() {
    const name = newName.trim()
    if (!name) return
    startTransition(async () => {
      const res = await addOpponentClub(name)
      if (res.error) { setError(res.error); return }
      const newClub: OpponentClubFull = {
        id: res.club!.id,
        name: res.club!.name,
        active: true,
        coordinator_name: null,
        coordinator_phone: null,
        coordinator_notes: null,
        venues: [],
      }
      setClubs(prev => [...prev, newClub].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName('')
      setError(null)
    })
  }

  function updateLocalClub(id: string, changes: Partial<OpponentClubFull>) {
    setClubs(prev => prev.map(c => c.id === id ? { ...c, ...changes } : c))
  }

  const active = clubs.filter(c => c.active)
  const inactive = clubs.filter(c => !c.active)

  return (
    <div className="space-y-2 pb-8">
      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</div>
      )}

      {/* Add new club */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Nombre del club..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
        />
        <button
          onClick={handleAdd}
          disabled={isPending || !newName.trim()}
          className="px-4 py-2 bg-vrc-green text-white rounded-xl text-sm font-semibold disabled:opacity-50"
        >
          Agregar
        </button>
      </div>

      {/* Active clubs */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2">
        Activos ({active.length})
      </p>
      {active.map(club => (
        <ClubCard
          key={club.id}
          club={club}
          expanded={expandedId === club.id}
          onToggleExpand={() => setExpandedId(expandedId === club.id ? null : club.id)}
          onUpdate={changes => updateLocalClub(club.id, changes)}
          onToggleActive={() => {
            startTransition(async () => {
              await toggleClubActive(club.id, false)
              updateLocalClub(club.id, { active: false })
            })
          }}
        />
      ))}

      {/* Inactive clubs */}
      {inactive.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-3">
            Inactivos ({inactive.length})
          </p>
          {inactive.map(club => (
            <ClubCard
              key={club.id}
              club={club}
              expanded={expandedId === club.id}
              onToggleExpand={() => setExpandedId(expandedId === club.id ? null : club.id)}
              onUpdate={changes => updateLocalClub(club.id, changes)}
              onToggleActive={() => {
                startTransition(async () => {
                  await toggleClubActive(club.id, true)
                  updateLocalClub(club.id, { active: true })
                })
              }}
            />
          ))}
        </>
      )}
    </div>
  )
}

// ── Club card ────────────────────────────────────────────────

interface ClubCardProps {
  club: OpponentClubFull
  expanded: boolean
  onToggleExpand: () => void
  onUpdate: (changes: Partial<OpponentClubFull>) => void
  onToggleActive: () => void
}

function ClubCard({ club, expanded, onToggleExpand, onUpdate, onToggleActive }: ClubCardProps) {
  const [editingCoord, setEditingCoord] = useState(false)
  const [coordName, setCoordName] = useState(club.coordinator_name ?? '')
  const [coordPhone, setCoordPhone] = useState(club.coordinator_phone ?? '')
  const [coordNotes, setCoordNotes] = useState(club.coordinator_notes ?? '')
  const [venues, setVenues] = useState<ClubVenue[]>(club.venues)
  const [isPending, startTransition] = useTransition()

  function saveCoordinator() {
    startTransition(async () => {
      const res = await updateClubCoordinator(club.id, {
        coordinator_name: coordName,
        coordinator_phone: coordPhone,
        coordinator_notes: coordNotes,
      })
      if (!res.error) {
        onUpdate({ coordinator_name: coordName || null, coordinator_phone: coordPhone || null, coordinator_notes: coordNotes || null })
        setEditingCoord(false)
      }
    })
  }

  function handleAddVenue() {
    startTransition(async () => {
      const res = await addVenue(club.id, club.name, '')
      if (res.venue) setVenues(prev => [...prev, res.venue!])
    })
  }

  function handleDeleteVenue(venueId: string) {
    startTransition(async () => {
      const res = await deleteVenue(venueId)
      if (!res.error) setVenues(prev => prev.filter(v => v.id !== venueId))
    })
  }

  const hasCoord = !!(club.coordinator_name || club.coordinator_phone)

  return (
    <div className={`bg-white rounded-xl border overflow-hidden ${club.active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
      {/* Header row */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{club.name}</p>
          {hasCoord && !expanded && (
            <p className="text-xs text-gray-400 truncate">{club.coordinator_name}{club.coordinator_phone ? ` · ${club.coordinator_phone}` : ''}</p>
          )}
        </div>
        {venues.length > 0 && (
          <span className="text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">{venues.length} sede{venues.length !== 1 ? 's' : ''}</span>
        )}
        <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-100">
          {/* Coordinator section */}
          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Coordinador infantil</p>
              {!editingCoord && (
                <button onClick={() => setEditingCoord(true)} className="text-xs text-vrc-green font-semibold">
                  {hasCoord ? 'Editar' : 'Agregar'}
                </button>
              )}
            </div>

            {editingCoord ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={coordName}
                  onChange={e => setCoordName(e.target.value)}
                  placeholder="Nombre completo"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
                />
                <input
                  type="tel"
                  value={coordPhone}
                  onChange={e => setCoordPhone(e.target.value)}
                  placeholder="WhatsApp (ej: 11 2233 4455)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
                />
                <input
                  type="text"
                  value={coordNotes}
                  onChange={e => setCoordNotes(e.target.value)}
                  placeholder="Notas (opcional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveCoordinator}
                    disabled={isPending}
                    className="px-3 py-1.5 bg-vrc-green text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                  >
                    Guardar
                  </button>
                  <button onClick={() => setEditingCoord(false)} className="text-xs text-gray-400">Cancelar</button>
                </div>
              </div>
            ) : hasCoord ? (
              <div className="space-y-1.5">
                {club.coordinator_name && (
                  <p className="text-sm font-medium text-gray-800">{club.coordinator_name}</p>
                )}
                {club.coordinator_phone && (
                  <div className="flex gap-2">
                    <a
                      href={`https://wa.me/${formatWhatsApp(club.coordinator_phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-xs font-semibold text-green-700"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                      </svg>
                      WhatsApp
                    </a>
                    <a
                      href={`tel:${club.coordinator_phone}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700"
                    >
                      📞 Llamar
                    </a>
                  </div>
                )}
                {club.coordinator_notes && (
                  <p className="text-xs text-gray-500 italic">{club.coordinator_notes}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Sin coordinador cargado</p>
            )}
          </div>

          {/* Venues section */}
          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sedes</p>
              <button onClick={handleAddVenue} disabled={isPending} className="text-xs text-vrc-green font-semibold">+ Agregar sede</button>
            </div>
            {venues.length === 0 ? (
              <p className="text-xs text-gray-400">Sin sedes cargadas</p>
            ) : (
              <div className="space-y-2">
                {venues.map(venue => (
                  <VenueRow
                    key={venue.id}
                    venue={venue}
                    onUpdate={updated => setVenues(prev => prev.map(v => v.id === updated.id ? updated : v))}
                    onDelete={() => handleDeleteVenue(venue.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer: activate/deactivate */}
          <div className="px-4 py-2 flex justify-end">
            <button
              onClick={onToggleActive}
              disabled={isPending}
              className="text-xs text-gray-400 hover:text-red-400"
            >
              {club.active ? 'Desactivar club' : 'Reactivar club'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Venue row ────────────────────────────────────────────────

function VenueRow({ venue, onUpdate, onDelete }: { venue: ClubVenue; onUpdate: (v: ClubVenue) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(!venue.name || venue.name === '')
  const [name, setName] = useState(venue.name)
  const [address, setAddress] = useState(venue.address ?? '')
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    if (!name.trim()) return
    startTransition(async () => {
      const res = await updateVenue(venue.id, name.trim(), address.trim())
      if (!res.error) {
        const mapsUrl = address.trim() ? `https://maps.google.com/?q=${encodeURIComponent(address.trim())}` : null
        onUpdate({ ...venue, name: name.trim(), address: address.trim() || null, maps_url: mapsUrl })
        setEditing(false)
      }
    })
  }

  if (editing) {
    return (
      <div className="bg-gray-50 rounded-xl p-3 space-y-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nombre de la sede"
          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-vrc-green"
          autoFocus
        />
        <input
          type="text"
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="Dirección (ej: Av. Corrientes 1234, CABA)"
          className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-vrc-green"
        />
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={isPending || !name.trim()} className="px-2.5 py-1 bg-vrc-green text-white rounded-lg text-xs font-semibold disabled:opacity-50">
            Guardar
          </button>
          <button onClick={() => setEditing(false)} className="text-xs text-gray-400">Cancelar</button>
          <button onClick={onDelete} className="ml-auto text-xs text-red-400 hover:text-red-600">Eliminar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-2">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-700">{venue.name}</p>
        {venue.address && <p className="text-xs text-gray-400 truncate">{venue.address}</p>}
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        {venue.maps_url && (
          <a href={venue.maps_url} target="_blank" rel="noopener noreferrer"
            className="text-xs px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg font-semibold">
            📍 Maps
          </a>
        )}
        <button onClick={() => setEditing(true)} className="text-xs px-2 py-1 bg-white border border-gray-200 text-gray-500 rounded-lg">
          Editar
        </button>
      </div>
    </div>
  )
}
