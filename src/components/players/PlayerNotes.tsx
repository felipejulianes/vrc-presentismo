'use client'

import { useState, useTransition } from 'react'
import { addNote, deleteNote } from '@/app/(app)/players/[playerId]/actions'

export type PlayerNote = {
  id: string
  note_date: string
  content: string
  created_by: string | null
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getTodayISO(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

interface Props {
  playerId: string
  notes: PlayerNote[]
  currentUserId: string
}

export function PlayerNotes({ playerId, notes, currentUserId }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await addNote(playerId, formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setOpen(false)
        ;(e.target as HTMLFormElement).reset()
      }
    })
  }

  function handleDelete(noteId: string) {
    startTransition(async () => {
      await deleteNote(playerId, noteId)
    })
  }

  return (
    <div className="px-4 pb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Bitácora</h2>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 text-xs font-medium text-vrc-green hover:text-green-800"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Agregar
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-400">Sin notas todavía</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {notes.map(n => (
            <div key={n.id} className="flex gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">{formatDate(n.note_date)}</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{n.content}</p>
              </div>
              {n.created_by === currentUserId && (
                <button
                  onClick={() => handleDelete(n.id)}
                  disabled={isPending}
                  className="p-1 text-gray-300 hover:text-red-400 self-start flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bottom sheet modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-t-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Nueva nota</h3>
              <button onClick={() => setOpen(false)} className="p-1 text-gray-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fecha</label>
                <input
                  type="date"
                  name="note_date"
                  defaultValue={getTodayISO()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nota</label>
                <textarea
                  name="content"
                  required
                  rows={4}
                  placeholder="Observaciones del jugador, comportamiento, novedades..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green resize-none"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2.5 bg-vrc-green hover:bg-green-800 disabled:bg-green-400 text-white font-semibold rounded-lg text-sm transition-colors"
              >
                {isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
