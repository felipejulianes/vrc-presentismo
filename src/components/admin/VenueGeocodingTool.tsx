'use client'

import { useState, useTransition } from 'react'
import { updateVenueCoords } from '@/app/(app)/admin/sabados/actions'
import type { ClubVenue } from '@/lib/queries/sabados'

interface VenuePending {
  id: string
  clubName: string
  name: string
  address: string
  status: 'pendiente' | 'geocodificando' | 'ok' | 'sin_resultado' | 'error'
  newMapsUrl?: string
}

interface Props {
  venues: (ClubVenue & { club_name: string })[]
}

export function VenueGeocodingTool({ venues }: Props) {
  const pendingVenues: VenuePending[] = venues
    .filter(v => v.address && v.lat == null)
    .map(v => ({
      id: v.id,
      clubName: v.club_name,
      name: v.name,
      address: v.address!,
      status: 'pendiente',
    }))

  const [items, setItems] = useState<VenuePending[]>(pendingVenues)
  const [running, setRunning] = useState(false)
  const [, startTransition] = useTransition()
  const [expanded, setExpanded] = useState(false)

  if (items.length === 0) return null

  const doneCount = items.filter(i => i.status === 'ok').length
  const errorCount = items.filter(i => i.status === 'sin_resultado' || i.status === 'error').length
  const pendingCount = items.filter(i => i.status === 'pendiente').length

  function updateItem(id: string, patch: Partial<VenuePending>) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))
  }

  async function runGeocoding() {
    setRunning(true)
    const toProcess = items.filter(i => i.status === 'pendiente' || i.status === 'sin_resultado')

    for (const item of toProcess) {
      updateItem(item.id, { status: 'geocodificando' })

      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(item.address)}`)
        const results: { display_name: string; lat: number; lng: number }[] = await res.json()

        if (results.length === 0) {
          updateItem(item.id, { status: 'sin_resultado' })
        } else {
          const { lat, lng } = results[0]
          const maps_url = `https://maps.google.com/?q=${lat},${lng}`
          startTransition(async () => {
            await updateVenueCoords(item.id, lat, lng, maps_url)
          })
          updateItem(item.id, { status: 'ok', newMapsUrl: maps_url })
        }
      } catch {
        updateItem(item.id, { status: 'error' })
      }

      // Respetar rate limit de Nominatim: 1 req/seg
      await new Promise(r => setTimeout(r, 1200))
    }

    setRunning(false)
  }

  const statusIcon = (s: VenuePending['status']) => {
    if (s === 'pendiente') return <span className="text-gray-400">○</span>
    if (s === 'geocodificando') return <span className="animate-spin inline-block">↻</span>
    if (s === 'ok') return <span className="text-green-500">✓</span>
    if (s === 'sin_resultado') return <span className="text-amber-500">?</span>
    return <span className="text-red-500">✗</span>
  }

  return (
    <div className="mb-4 border border-amber-200 bg-amber-50 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <span className="text-base">📍</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900">
            {items.length} sede{items.length !== 1 ? 's' : ''} sin coordenadas
          </p>
          <p className="text-xs text-amber-700">
            {doneCount > 0 && `${doneCount} geocodificadas · `}
            {errorCount > 0 && `${errorCount} sin resultado · `}
            {pendingCount} pendientes
          </p>
        </div>
        <svg className={`w-4 h-4 text-amber-600 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-amber-200 divide-y divide-amber-100">
          <div className="px-4 py-3 space-y-2">
            <p className="text-xs text-amber-800">
              Estas sedes tienen dirección ingresada pero sin coordenadas exactas — sus links a Maps usan búsqueda de texto.
              Geocodificarlas mejora la precisión del pin.
            </p>
            <button
              onClick={runGeocoding}
              disabled={running || pendingCount === 0}
              className="px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              {running ? 'Geocodificando... (1 por segundo)' : `Geocodificar ${pendingCount} sede${pendingCount !== 1 ? 's' : ''}`}
            </button>
          </div>

          <div className="divide-y divide-amber-50">
            {items.map(item => (
              <div key={item.id} className="flex items-start gap-3 px-4 py-2.5">
                <span className="text-sm mt-0.5 flex-shrink-0 w-4 text-center">{statusIcon(item.status)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">
                    {item.clubName} — {item.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{item.address}</p>
                  {item.status === 'sin_resultado' && (
                    <p className="text-xs text-amber-600">Sin resultado en OpenStreetMap — editá la dirección manualmente</p>
                  )}
                  {item.status === 'ok' && item.newMapsUrl && (
                    <a href={item.newMapsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                      Ver pin →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
