'use client'

import { useState, useTransition } from 'react'
import { updateSchool, mergeSchools, createSchool } from '@/app/(app)/admin/schools/actions'
import type { SchoolWithCount } from '@/lib/queries/schools'

interface Props { schools: SchoolWithCount[] }

export function SchoolsManager({ schools: initialSchools }: Props) {
  const [schools, setSchools] = useState(initialSchools)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [mergingId, setMergingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAliases, setNewAliases] = useState('')
  const [isPending, startTransition] = useTransition()

  const active = schools.filter(s => s.active)
  const inactive = schools.filter(s => !s.active)

  function handleSave(fd: FormData) {
    startTransition(async () => {
      await updateSchool(fd)
      setEditingId(null)
    })
  }

  function handleMerge(fd: FormData) {
    startTransition(async () => {
      await mergeSchools(fd)
      setMergingId(null)
    })
  }

  function handleCreate() {
    if (!newName.trim()) return
    startTransition(async () => {
      const created = await createSchool(newName.trim())
      if (created) {
        // Also save aliases if provided
        if (newAliases.trim()) {
          const fd = new FormData()
          fd.append('id', created.id)
          fd.append('name', created.name)
          fd.append('aliases', newAliases.trim())
          await updateSchool(fd)
        }
        setSchools(prev => [...prev, {
          id: created.id, name: created.name,
          aliases: newAliases.trim() || null, active: true, player_count: 0,
          address: null, lat: null, lng: null, maps_url: null,
        }])
        setNewName('')
        setNewAliases('')
        setAdding(false)
      }
    })
  }

  function handleDeactivate(id: string, name: string) {
    if (!confirm(`¿Desactivar "${name}"? Los jugadores asociados quedarán sin colegio asignado.`)) return
    const fd = new FormData()
    fd.append('id', id)
    fd.append('name', name)
    fd.append('active', 'false')
    startTransition(async () => {
      await updateSchool(fd)
      setSchools(prev => prev.map(s => s.id === id ? { ...s, active: false } : s))
    })
  }

  return (
    <div className="space-y-4">
      {/* Nuevo colegio */}
      {adding ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-2">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Nombre del colegio"
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
          />
          <input
            type="text"
            value={newAliases}
            onChange={e => setNewAliases(e.target.value)}
            placeholder='Aliases opcionales: "la 30, treinta" (separados por coma)'
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || isPending}
              className="flex-1 py-1.5 bg-vrc-green text-white rounded-lg text-sm font-semibold disabled:opacity-40"
            >
              {isPending ? 'Agregando...' : 'Agregar colegio'}
            </button>
            <button
              onClick={() => { setAdding(false); setNewName(''); setNewAliases('') }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full py-2.5 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:text-vrc-green hover:border-vrc-green transition-colors"
        >
          + Agregar colegio
        </button>
      )}

      {/* Active schools */}
      <div className="space-y-2">
        {active.map(school => (
          <SchoolRow
            key={school.id}
            school={school}
            allSchools={active}
            editing={editingId === school.id}
            merging={mergingId === school.id}
            isPending={isPending}
            onEdit={() => setEditingId(school.id)}
            onCancelEdit={() => setEditingId(null)}
            onSave={handleSave}
            onMerge={handleMerge}
            onCancelMerge={() => setMergingId(null)}
            onStartMerge={() => setMergingId(school.id)}
            onDeactivate={() => handleDeactivate(school.id, school.name)}
          />
        ))}
      </div>

      {/* Inactive schools */}
      {inactive.length > 0 && (
        <details className="text-sm">
          <summary className="text-gray-400 cursor-pointer select-none">
            {inactive.length} colegio{inactive.length !== 1 ? 's' : ''} desactivado{inactive.length !== 1 ? 's' : ''}
          </summary>
          <div className="mt-2 space-y-1">
            {inactive.map(school => (
              <div key={school.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg opacity-60">
                <span className="flex-1 text-sm text-gray-500 line-through">{school.name}</span>
                <span className="text-xs text-gray-400">{school.player_count} jugadores</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

interface RowProps {
  school: SchoolWithCount
  allSchools: SchoolWithCount[]
  editing: boolean
  merging: boolean
  isPending: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onSave: (fd: FormData) => void
  onMerge: (fd: FormData) => void
  onCancelMerge: () => void
  onStartMerge: () => void
  onDeactivate: () => void
}

function SchoolRow({
  school, allSchools, editing, merging, isPending,
  onEdit, onCancelEdit, onSave, onMerge, onCancelMerge, onStartMerge, onDeactivate,
}: RowProps) {
  const [name, setName] = useState(school.name)
  const [aliases, setAliases] = useState(school.aliases ?? '')
  const [mergeTarget, setMergeTarget] = useState('')

  if (merging) {
    const others = allSchools.filter(s => s.id !== school.id)
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
        <p className="text-sm font-medium text-amber-900">
          Fusionar <strong>{school.name}</strong> con:
        </p>
        <select
          value={mergeTarget}
          onChange={e => setMergeTarget(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="">Elegir colegio destino...</option>
          {others.map(s => (
            <option key={s.id} value={s.id}>{s.name} ({s.player_count} jugadores)</option>
          ))}
        </select>
        {mergeTarget && (
          <p className="text-xs text-amber-700">
            Se reasignan los {school.player_count} jugadores de &ldquo;{school.name}&rdquo; al destino y se desactiva este colegio.
          </p>
        )}
        <div className="flex gap-2">
          <button
            disabled={!mergeTarget || isPending}
            onClick={() => {
              const fd = new FormData()
              fd.append('source_id', school.id)
              fd.append('target_id', mergeTarget)
              onMerge(fd)
            }}
            className="flex-1 py-1.5 bg-amber-600 text-white rounded-lg text-sm font-semibold disabled:opacity-40"
          >
            Fusionar
          </button>
          <button onClick={onCancelMerge} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600">
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nombre del colegio"
          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
        />
        <input
          value={aliases}
          onChange={e => setAliases(e.target.value)}
          placeholder='Aliases: "la 30, treinta, EEN 30" (separados por coma)'
          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
        />
        <p className="text-xs text-gray-400">Los aliases se usan para buscar el colegio por nombres alternativos.</p>
        <div className="flex gap-2">
          <button
            disabled={!name.trim() || isPending}
            onClick={() => {
              const fd = new FormData()
              fd.append('id', school.id)
              fd.append('name', name)
              fd.append('aliases', aliases)
              onSave(fd)
            }}
            className="flex-1 py-1.5 bg-vrc-green text-white rounded-lg text-sm font-semibold disabled:opacity-40"
          >
            Guardar
          </button>
          <button onClick={onCancelEdit} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600">
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{school.name}</p>
        {school.aliases && (
          <p className="text-xs text-gray-400 truncate">{school.aliases}</p>
        )}
      </div>
      <span className={`text-sm font-bold flex-shrink-0 ${school.player_count > 0 ? 'text-green-700' : 'text-gray-300'}`}>
        {school.player_count}
      </span>
      <div className="flex gap-1 flex-shrink-0">
        <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-blue-600" title="Editar">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a4 4 0 01-1.414.793l-3 .75.75-3a4 4 0 01.793-1.414z" />
          </svg>
        </button>
        <button onClick={onStartMerge} className="p-1.5 text-gray-400 hover:text-amber-600" title="Fusionar con otro">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </button>
        <button onClick={onDeactivate} className="p-1.5 text-gray-400 hover:text-red-400" title="Desactivar">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
