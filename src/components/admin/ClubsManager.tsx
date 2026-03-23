'use client'

import { useState, useTransition } from 'react'
import { addOpponentClub, renameClub, toggleClubActive } from '@/app/(app)/admin/sabados/actions'
import type { OpponentClub } from '@/lib/queries/sabados'

interface Props {
  initialClubs: OpponentClub[]
}

export function ClubsManager({ initialClubs }: Props) {
  const [clubs, setClubs] = useState(initialClubs)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleAdd() {
    const name = newName.trim()
    if (!name) return
    startTransition(async () => {
      const res = await addOpponentClub(name)
      if (res.error) { setError(res.error); return }
      setClubs(prev => [...prev, res.club as OpponentClub].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName('')
      setError(null)
    })
  }

  function startEdit(club: OpponentClub) {
    setEditingId(club.id)
    setEditName(club.name)
  }

  function handleRename(id: string) {
    const name = editName.trim()
    if (!name) return
    startTransition(async () => {
      const res = await renameClub(id, name)
      if (res.error) { setError(res.error); return }
      setClubs(prev =>
        prev.map(c => c.id === id ? { ...c, name } : c)
          .sort((a, b) => a.name.localeCompare(b.name))
      )
      setEditingId(null)
      setError(null)
    })
  }

  function handleToggle(club: OpponentClub) {
    startTransition(async () => {
      const res = await toggleClubActive(club.id, !club.active)
      if (res.error) { setError(res.error); return }
      setClubs(prev => prev.map(c => c.id === club.id ? { ...c, active: !c.active } : c))
    })
  }

  const active = clubs.filter(c => c.active)
  const inactive = clubs.filter(c => !c.active)

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Add new club */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Nombre del club…"
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
      {active.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {active.map(club => (
            <ClubRow
              key={club.id}
              club={club}
              isEditing={editingId === club.id}
              editName={editName}
              setEditName={setEditName}
              onStartEdit={() => startEdit(club)}
              onRename={() => handleRename(club.id)}
              onCancelEdit={() => setEditingId(null)}
              onToggle={() => handleToggle(club)}
              isPending={isPending}
            />
          ))}
        </div>
      )}

      {active.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">No hay clubes todavía.</p>
      )}

      {/* Inactive clubs */}
      {inactive.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Desactivados</p>
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 opacity-60">
            {inactive.map(club => (
              <ClubRow
                key={club.id}
                club={club}
                isEditing={editingId === club.id}
                editName={editName}
                setEditName={setEditName}
                onStartEdit={() => startEdit(club)}
                onRename={() => handleRename(club.id)}
                onCancelEdit={() => setEditingId(null)}
                onToggle={() => handleToggle(club)}
                isPending={isPending}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ClubRow({
  club, isEditing, editName, setEditName,
  onStartEdit, onRename, onCancelEdit, onToggle, isPending,
}: {
  club: OpponentClub
  isEditing: boolean
  editName: string
  setEditName: (v: string) => void
  onStartEdit: () => void
  onRename: () => void
  onCancelEdit: () => void
  onToggle: () => void
  isPending: boolean
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {isEditing ? (
        <>
          <input
            autoFocus
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') onRename()
              if (e.key === 'Escape') onCancelEdit()
            }}
            className="flex-1 px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-vrc-green"
          />
          <button onClick={onRename} disabled={isPending} className="text-xs font-semibold text-vrc-green">OK</button>
          <button onClick={onCancelEdit} className="text-xs text-gray-400">Cancelar</button>
        </>
      ) : (
        <>
          <span className={`flex-1 text-sm font-medium ${club.active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
            {club.name}
          </span>
          <button
            onClick={onStartEdit}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Renombrar"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onToggle}
            disabled={isPending}
            className={`text-xs px-2 py-1 rounded-lg font-medium ${
              club.active
                ? 'text-red-600 hover:bg-red-50'
                : 'text-green-700 hover:bg-green-50'
            }`}
          >
            {club.active ? 'Desactivar' : 'Activar'}
          </button>
        </>
      )}
    </div>
  )
}
