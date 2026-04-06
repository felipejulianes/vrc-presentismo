'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { GeocodeResult } from '@/app/api/geocode/route'

export interface AddressValue {
  address: string
  lat: number | null
  lng: number | null
  maps_url: string | null
}

interface Props {
  value: AddressValue | null
  onChange: (v: AddressValue | null) => void
  placeholder?: string
  focusRingColor?: string // e.g. 'focus:ring-green-600' or 'focus:ring-orange-400'
}

export function AddressInput({
  value,
  onChange,
  placeholder = 'Buscar dirección...',
  focusRingColor = 'focus:ring-green-600',
}: Props) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
      const data: GeocodeResult[] = await res.json()
      setSuggestions(data)
      setOpen(data.length > 0)
    } catch {
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [])

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 600)
  }

  function handleSelect(result: GeocodeResult) {
    const mapsUrl = `https://maps.google.com/?q=${result.lat},${result.lng}`
    onChange({
      address: result.display_name,
      lat: result.lat,
      lng: result.lng,
      maps_url: mapsUrl,
    })
    setQuery('')
    setSuggestions([])
    setOpen(false)
  }

  function handleSaveAsText() {
    if (!query.trim()) return
    const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(query.trim())}`
    onChange({
      address: query.trim(),
      lat: null,
      lng: null,
      maps_url: mapsUrl,
    })
    setQuery('')
    setSuggestions([])
    setOpen(false)
  }

  function handleClear() {
    onChange(null)
    setQuery('')
    setSuggestions([])
    setOpen(false)
  }

  // ── Confirmed state ────────────────────────────────────────────────────────
  if (value) {
    return (
      <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
        <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800 leading-snug break-words">{value.address}</p>
          {value.lat && (
            <p className="text-xs text-gray-400 mt-0.5">{value.lat.toFixed(5)}, {value.lng?.toFixed(5)}</p>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0 ml-1">
          {value.maps_url && (
            <a
              href={value.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-blue-500 hover:text-blue-700 transition-colors"
              title="Ver en Google Maps"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
            </a>
          )}
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
            title="Cambiar dirección"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  // ── Search state ───────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={`w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 ${focusRingColor}`}
          autoComplete="off"
        />
        {/* Pin icon */}
        <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {/* Spinner */}
        {loading && (
          <svg className="absolute right-2.5 top-2.5 w-4 h-4 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
      </div>

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => handleSelect(s)}
              className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-orange-50 transition-colors border-b border-gray-50 last:border-0"
            >
              <svg className="w-3.5 h-3.5 text-orange-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              <span className="text-sm text-gray-700 leading-snug">{s.display_name}</span>
            </button>
          ))}
          {/* Fallback: save typed text without geocoding */}
          {query.length >= 3 && (
            <button
              type="button"
              onMouseDown={handleSaveAsText}
              className="w-full flex items-center gap-2 px-3 py-2 text-left bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="text-xs text-gray-500">Guardar &ldquo;{query}&rdquo; sin geocodificar</span>
            </button>
          )}
        </div>
      )}

      {/* Hint when no results and query is long enough */}
      {!loading && !open && query.length >= 3 && suggestions.length === 0 && (
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-xs text-gray-400">Sin resultados para esa búsqueda</p>
          <button
            type="button"
            onClick={handleSaveAsText}
            className="text-xs text-blue-500 hover:text-blue-700 underline"
          >
            Guardar igual
          </button>
        </div>
      )}
    </div>
  )
}
