'use client'

import { useState } from 'react'
import type { OpponentClubFull, ClubVenue } from '@/lib/queries/sabados'

export function ClubsView({ clubs }: { clubs: OpponentClubFull[] }) {
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = clubs.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar club..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green bg-white"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
        {search && (
          <p className="text-xs text-gray-400 mt-1.5 px-1">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Club list */}
      <div className="divide-y divide-gray-100 bg-white border-t border-b border-gray-200">
        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-400">No se encontró &quot;{search}&quot;</p>
        ) : (
          filtered.map(club => (
            <ClubCard
              key={club.id}
              club={club}
              expanded={expandedId === club.id}
              onToggle={() => setExpandedId(expandedId === club.id ? null : club.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function ClubCard({
  club,
  expanded,
  onToggle,
}: {
  club: OpponentClubFull
  expanded: boolean
  onToggle: () => void
}) {
  const defaultVenue: ClubVenue | undefined = club.venues.find(v => v.is_default) ?? club.venues[0]

  return (
    <div>
      {/* Club row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-gray-50"
      >
        {/* Club initial */}
        <div className="w-8 h-8 rounded-full bg-vrc-green/10 text-vrc-green flex items-center justify-center flex-shrink-0 text-xs font-bold">
          {club.name.charAt(0)}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{club.name}</p>
          {!expanded && defaultVenue?.address && (
            <p className="text-xs text-gray-400 truncate mt-0.5">{defaultVenue.address}</p>
          )}
          {!expanded && !defaultVenue?.address && (
            <p className="text-xs text-gray-300 mt-0.5">Sin dirección cargada</p>
          )}
        </div>

        {/* Quick Maps button (only if venue has maps_url and not expanded) */}
        {!expanded && defaultVenue?.maps_url && (
          <a
            href={defaultVenue.maps_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-blue-500 hover:text-blue-700 text-lg"
            title="Abrir en Google Maps"
          >
            📍
          </a>
        )}

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-gray-300 flex-shrink-0 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Expanded: venue details */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 bg-gray-50/70 border-t border-gray-100">
          {club.venues.length === 0 ? (
            <p className="text-xs text-gray-400 py-2 text-center">Sin sede cargada</p>
          ) : (
            <div className="space-y-3">
              {club.venues.map(venue => (
                <VenueDetail key={venue.id} venue={venue} multipleVenues={club.venues.length > 1} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function VenueDetail({ venue, multipleVenues }: { venue: ClubVenue; multipleVenues: boolean }) {
  return (
    <div className="rounded-xl bg-white border border-gray-200 px-4 py-3">
      {multipleVenues && (
        <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">{venue.name}</p>
      )}
      {venue.address ? (
        <p className="text-sm text-gray-700 leading-snug">{venue.address}</p>
      ) : (
        <p className="text-sm text-gray-400">Sin dirección cargada</p>
      )}
      {venue.maps_url && (
        <a
          href={venue.maps_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg"
        >
          📍 Abrir en Google Maps
        </a>
      )}
    </div>
  )
}
