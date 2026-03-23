'use client'

import { useState, useTransition } from 'react'
import { saveBus, deleteBus } from '@/app/(app)/admin/sabados/actions'
import type { EventBus } from '@/lib/queries/sabados'

interface Props {
  date: string
  buses: EventBus[]
}

export function BusesManager({ date, buses: initialBuses }: Props) {
  const [buses, setBuses] = useState(initialBuses)
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [phone, setPhone] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    if (!label.trim()) return
    const fd = new FormData()
    fd.append('event_date', date)
    fd.append('label', label.trim())
    fd.append('driver_phone', phone.trim())
    startTransition(async () => {
      const res = await saveBus(fd)
      if (!res.error) {
        // Optimistically reset — page will revalidate
        setLabel('')
        setPhone('')
        setAdding(false)
      }
    })
  }

  function handleDelete(busId: string) {
    startTransition(async () => {
      await deleteBus(busId, date)
      setBuses(prev => prev.filter(b => b.id !== busId))
    })
  }

  return (
    <div className="space-y-2">
      {buses.length === 0 && !adding && (
        <p className="text-sm text-gray-400 text-center py-2">Sin bondis configurados</p>
      )}

      {buses.map(bus => (
        <div key={bus.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">{bus.label}</p>
            {bus.driver_phone && (
              <a href={`tel:${bus.driver_phone}`} className="text-xs text-blue-600">
                📞 {bus.driver_phone}
              </a>
            )}
          </div>
          <button
            onClick={() => handleDelete(bus.id)}
            disabled={isPending}
            className="p-1.5 text-gray-300 hover:text-red-400"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ))}

      {adding ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder='Ej: "Bondi 1"'
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
              autoFocus
            />
          </div>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Tel. chofer (opcional)"
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={isPending || !label.trim()}
              className="flex-1 py-1.5 bg-vrc-green text-white rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {isPending ? 'Guardando...' : 'Agregar'}
            </button>
            <button
              onClick={() => { setAdding(false); setLabel(''); setPhone('') }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full py-2 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:text-vrc-green hover:border-vrc-green transition-colors"
        >
          + Agregar bondi
        </button>
      )}
    </div>
  )
}
