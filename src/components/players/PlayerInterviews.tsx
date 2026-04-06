'use client'

import { useState, useTransition } from 'react'
import { addInterview, deleteInterview } from '@/app/(app)/players/[playerId]/actions'
import { getTodayISO, formatMediumDate } from '@/lib/utils/dates'
import type { PlayerInterview } from '@/types'

interface Props {
  playerId: string
  interviews: PlayerInterview[]
  currentUserId: string
  currentUserRole: 'admin' | 'tutora' | 'coach'
  playerColegio: string | null
  playerGrado: string | null
}

export function PlayerInterviews({
  playerId,
  interviews,
  currentUserId,
  currentUserRole,
  playerColegio,
  playerGrado,
}: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const canAdd = currentUserRole === 'admin' || currentUserRole === 'tutora'

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await addInterview(playerId, formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setOpen(false)
        ;(e.target as HTMLFormElement).reset()
      }
    })
  }

  function handleDelete(interviewId: string) {
    startTransition(async () => {
      await deleteInterview(playerId, interviewId)
    })
  }

  return (
    <div className="px-4 pb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Entrevistas</h2>
        {canAdd && (
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-1 text-xs font-medium text-vrc-green hover:text-green-800"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar
          </button>
        )}
      </div>

      {interviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
          <p className="text-sm text-gray-400">Sin entrevistas registradas</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {interviews.map(iv => (
            <div key={iv.id} className="flex gap-3 px-4 py-3">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-400">{formatMediumDate(iv.interview_date)}</p>
                  {iv.interviewer_name && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">
                      {iv.interviewer_name}
                    </span>
                  )}
                </div>
                {(iv.grado || iv.colegio_snapshot) && (
                  <p className="text-xs text-gray-500">
                    {[iv.grado, iv.colegio_snapshot].filter(Boolean).join(' · ')}
                  </p>
                )}
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{iv.notas}</p>
              </div>
              {(iv.interviewer_id === currentUserId || currentUserRole === 'admin') && (
                <button
                  onClick={() => handleDelete(iv.id)}
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
              <h3 className="text-base font-bold text-gray-900">Nueva entrevista</h3>
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
                  name="interview_date"
                  defaultValue={getTodayISO()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Grado</label>
                  <input
                    type="text"
                    name="grado"
                    defaultValue={playerGrado ?? ''}
                    placeholder="Ej: 3° ESB"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Colegio</label>
                  <input
                    type="text"
                    name="colegio_snapshot"
                    defaultValue={playerColegio ?? ''}
                    placeholder="Nombre del colegio"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notas de la entrevista</label>
                <textarea
                  name="notas"
                  required
                  rows={4}
                  placeholder="Temas tratados, situación escolar, seguimiento..."
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
                {isPending ? 'Guardando...' : 'Guardar entrevista'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
