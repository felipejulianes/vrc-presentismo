'use client'

import { useState, useTransition } from 'react'
import { createBus, updateBus, toggleBusActive } from '@/app/(app)/admin/buses/actions'
import type { EventBus } from '@/lib/queries/sabados'

interface Props {
  buses: EventBus[]
}

export function BusesManager({ buses: initialBuses }: Props) {
  const [buses, setBuses] = useState(initialBuses)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [isPending, startTransition] = useTransition()

  const active = buses.filter(b => b.active)
  const inactive = buses.filter(b => !b.active)

  function handleCreate(fd: FormData) {
    startTransition(async () => {
      const res = await createBus(fd)
      if (res.bus) {
        setBuses(prev => [...prev, res.bus!])
        setAdding(false)
      }
    })
  }

  function handleUpdate(fd: FormData) {
    const id = fd.get('id') as string
    startTransition(async () => {
      const res = await updateBus(fd)
      if (res.success) {
        setBuses(prev => prev.map(b => b.id === id ? {
          ...b,
          label: fd.get('label') as string,
          patente: (fd.get('patente') as string) || null,
          driver_name: (fd.get('driver_name') as string) || null,
          driver_phone: (fd.get('driver_phone') as string) || null,
        } : b))
        setEditingId(null)
      }
    })
  }

  function handleToggle(id: string, active: boolean) {
    startTransition(async () => {
      await toggleBusActive(id, active)
      setBuses(prev => prev.map(b => b.id === id ? { ...b, active } : b))
    })
  }

  return (
    <div className="space-y-4">
      {/* Activos */}
      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        {active.length === 0 && !adding && (
          <p className="text-sm text-gray-400 text-center py-6">Sin bondis cargados</p>
        )}
        {active.map(bus => (
          <BusRow
            key={bus.id}
            bus={bus}
            editing={editingId === bus.id}
            isPending={isPending}
            onEdit={() => setEditingId(editingId === bus.id ? null : bus.id)}
            onSave={handleUpdate}
            onToggle={() => handleToggle(bus.id, false)}
          />
        ))}
        {adding ? (
          <BusForm
            onSave={handleCreate}
            onCancel={() => setAdding(false)}
            isPending={isPending}
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full py-3 text-sm text-gray-400 hover:text-green-700 hover:bg-gray-50 transition-colors"
          >
            + Agregar bondi
          </button>
        )}
      </div>

      {/* Inactivos */}
      {inactive.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
            Inactivos
          </p>
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {inactive.map(bus => (
              <div key={bus.id} className="flex items-center gap-3 px-4 py-3 opacity-50">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">{bus.label}</p>
                  {bus.patente && <p className="text-xs text-gray-400 font-mono">{bus.patente}</p>}
                </div>
                <button
                  onClick={() => handleToggle(bus.id, true)}
                  disabled={isPending}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Reactivar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BusRow({
  bus, editing, isPending, onEdit, onSave, onToggle,
}: {
  bus: EventBus
  editing: boolean
  isPending: boolean
  onEdit: () => void
  onSave: (fd: FormData) => void
  onToggle: () => void
}) {
  if (editing) {
    return (
      <BusForm
        bus={bus}
        onSave={onSave}
        onCancel={onEdit}
        isPending={isPending}
      />
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-800">{bus.label}</p>
          {bus.patente && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
              {bus.patente}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 space-x-2">
          {bus.driver_name && <span>{bus.driver_name}</span>}
          {bus.driver_phone && (
            <a href={`tel:${bus.driver_phone}`} className="text-blue-600">
              {bus.driver_phone}
            </a>
          )}
        </div>
      </div>
      <button
        onClick={onEdit}
        className="text-xs px-2 py-1 border border-gray-200 text-gray-400 rounded-lg hover:border-gray-300 hover:text-gray-600"
      >
        ✎
      </button>
      <button
        onClick={onToggle}
        disabled={isPending}
        className="p-1 text-gray-300 hover:text-red-400"
        title="Desactivar"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}

function BusForm({
  bus, onSave, onCancel, isPending,
}: {
  bus?: EventBus
  onSave: (fd: FormData) => void
  onCancel: () => void
  isPending: boolean
}) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    onSave(new FormData(e.currentTarget))
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 bg-green-50 space-y-2">
      {bus && <input type="hidden" name="id" value={bus.id} />}
      <input
        name="label"
        defaultValue={bus?.label ?? ''}
        required
        autoFocus
        placeholder='Nombre — ej: "Bondi 1"'
        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
      />
      <div className="flex gap-2">
        <input
          name="driver_name"
          defaultValue={bus?.driver_name ?? ''}
          placeholder="Nombre del chofer"
          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none"
        />
        <input
          name="patente"
          defaultValue={bus?.patente ?? ''}
          placeholder="Patente"
          className="w-28 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none"
        />
      </div>
      <input
        name="driver_phone"
        defaultValue={bus?.driver_phone ?? ''}
        type="tel"
        placeholder="Teléfono chofer (opcional)"
        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none"
      />
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 py-1.5 bg-green-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          {isPending ? 'Guardando...' : bus ? 'Guardar cambios' : 'Agregar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
