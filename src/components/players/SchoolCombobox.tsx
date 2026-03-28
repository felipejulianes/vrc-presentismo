'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { School } from '@/lib/queries/schools'

interface SchoolValue {
  id: string
  name: string
}

interface Props {
  schools: School[]
  value: SchoolValue | null
  onChange: (v: SchoolValue | null) => void
}

function matches(school: School, q: string): boolean {
  const low = q.toLowerCase()
  if (school.name.toLowerCase().includes(low)) return true
  if (!school.aliases) return false
  return school.aliases.toLowerCase().includes(low)
}

export function SchoolCombobox({ schools, value, onChange }: Props) {
  const [input, setInput] = useState(value?.name ?? '')
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Sync input when value changes externally
  useEffect(() => { setInput(value?.name ?? '') }, [value])

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        // If user typed but didn't select, restore previous value
        setInput(value?.name ?? '')
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open, value])

  const q = input.trim()
  const filtered = q.length >= 1 ? schools.filter(s => matches(s, q)) : schools
  const exactMatch = schools.some(s => s.name.toLowerCase() === q.toLowerCase())

  function handleSelect(school: School) {
    onChange({ id: school.id, name: school.name })
    setInput(school.name)
    setOpen(false)
  }

  function handleClear() {
    onChange(null)
    setInput('')
    setOpen(false)
  }

  async function handleAddNew() {
    if (!q || adding) return
    setAdding(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('schools')
        .insert({ name: q.trim() })
        .select('id, name')
        .single()
      if (!error && data) {
        onChange({ id: data.id, name: data.name })
        setInput(data.name)
        setOpen(false)
      }
    } finally {
      setAdding(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar colegio..."
          className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && !q && (
              <p className="text-xs text-gray-400 text-center py-4">Escribí para buscar</p>
            )}
            {filtered.map(school => (
              <button
                key={school.id}
                type="button"
                onClick={() => handleSelect(school)}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center justify-between gap-2"
              >
                <div>
                  <span className="text-sm text-gray-800">{school.name}</span>
                  {school.aliases && (
                    <span className="text-xs text-gray-400 ml-1.5">· {school.aliases}</span>
                  )}
                </div>
              </button>
            ))}

            {/* Agregar nuevo */}
            {q && !exactMatch && (
              <button
                type="button"
                onClick={handleAddNew}
                disabled={adding}
                className="w-full text-left px-4 py-2.5 border-t border-gray-100 hover:bg-green-50 flex items-center gap-2 text-green-700"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm font-medium">
                  {adding ? 'Agregando...' : `Agregar "${q}" como colegio nuevo`}
                </span>
              </button>
            )}
            {q && filtered.length === 0 && !q && (
              <p className="text-xs text-gray-400 text-center py-2">Sin resultados</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
