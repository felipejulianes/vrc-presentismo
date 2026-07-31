'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PlayerCard } from './PlayerCard'
import { useAttendance } from '@/lib/hooks/useAttendance'
import type { Player, AttendanceState } from '@/types'

interface AttendanceGridProps {
  players: Player[]
  divisionId: string
  divisionName: string
  date: string
  initialAttendance: AttendanceState
  showDatePicker?: boolean
  backUrl?: string
  birthdays?: Record<string, string>
}

function todayDate() {
  return new Date().toISOString().split('T')[0]
}

export function AttendanceGrid({
  players,
  divisionId,
  divisionName,
  date: initialDate,
  initialAttendance,
  showDatePicker = false,
  backUrl,
  birthdays,
}: AttendanceGridProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [date, setDate] = useState(initialDate)
  const { attendance, toggle, save, saving, saved, error, presentCount } = useAttendance({
    initialState: initialAttendance,
    divisionId,
    date,
  })

  const handleDateChange = (newDate: string) => {
    setDate(newDate)
    // Reload page with new date to get existing attendance
    router.push(`/attendance/${divisionId}/new?date=${newDate}`)
  }

  // Sort: inactivos al final
  const sorted = [...players].sort((a, b) => {
    if (a.inactivo !== b.inactivo) return a.inactivo ? 1 : -1
    return a.last_name.localeCompare(b.last_name)
  })

  const filtered = sorted.filter(p => {
    const q = search.toLowerCase()
    return (
      p.first_name.toLowerCase().includes(q) ||
      p.last_name.toLowerCase().includes(q)
    )
  })

  const formattedDate = new Date(date + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="flex flex-col min-h-full">
      {/* Header info */}
      <div className="px-4 pt-4 pb-2 flex items-start gap-2">
        {backUrl && (
          <Link href={backUrl} className="p-1 text-gray-500 mt-0.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        )}
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">{divisionName}</h1>
          {showDatePicker ? (
            <input
              type="date"
              value={date}
              max={todayDate()}
              onChange={e => handleDateChange(e.target.value)}
              className="mt-1 px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          ) : (
            <p className="text-sm text-gray-500 capitalize">{formattedDate}</p>
          )}
        </div>
      </div>

      {/* Buscador */}
      <div className="px-4 pb-3">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar jugador..."
          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {/* Grilla */}
      <div className="flex-1 px-4 pb-24">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">
            {search ? 'No se encontraron jugadores' : 'No hay jugadores en esta división'}
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {filtered.map(player => (
              <PlayerCard
                key={player.id}
                player={player}
                present={!!attendance[player.id]}
                onToggle={() => toggle(player.id)}
                birthdayLabel={birthdays?.[player.id]}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer fijo: contador + guardar */}
      <div className="sticky bottom-16 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3">
        {/* Counter */}
        <div className="flex-1">
          <span className="text-2xl font-bold text-green-700">{presentCount}</span>
          <span className="text-gray-400 text-sm"> / {players.length} presentes</span>
        </div>

        {/* Feedback */}
        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}
        {saved && !saving && (
          <p className="text-xs text-green-600 font-medium">✓ Guardado</p>
        )}

        {/* Botón guardar */}
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2.5 bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white font-semibold rounded-xl text-sm transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
