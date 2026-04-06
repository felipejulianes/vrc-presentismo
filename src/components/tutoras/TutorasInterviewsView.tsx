'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createInterviewFromTutoras, deleteInterviewFromTutoras } from '@/app/(app)/tutoras/actions'
import { SchoolCombobox } from '@/components/players/SchoolCombobox'
import type { AllInterviewRow } from '@/lib/queries/interviews'
import type { Player } from '@/types'
import type { School } from '@/lib/queries/schools'

type PlayerWithDivision = Player & { division_name: string }
type SchoolValue = { id: string; name: string }

interface Props {
  interviews: AllInterviewRow[]
  players: PlayerWithDivision[]
  schools: School[]
  currentUserId: string
}

export function TutorasInterviewsView({ interviews, players, schools, currentUserId }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [playerSearch, setPlayerSearch] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerWithDivision | null>(null)
  const [formGrado, setFormGrado] = useState('')
  const [updateSchool, setUpdateSchool] = useState(false)
  const [newSchool, setNewSchool] = useState<SchoolValue | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  const filteredPlayers = playerSearch.trim().length > 0
    ? players.filter(p => {
        const q = playerSearch.toLowerCase()
        return `${p.first_name} ${p.last_name} ${p.sobrenombre ?? ''}`.toLowerCase().includes(q)
      })
    : players

  function openModal() {
    setShowModal(true)
    setPlayerSearch('')
    setSelectedPlayer(null)
    setFormGrado('')
    setUpdateSchool(false)
    setNewSchool(null)
    setError(null)
  }

  function closeModal() {
    setShowModal(false)
    setSelectedPlayer(null)
    setPlayerSearch('')
    setUpdateSchool(false)
    setNewSchool(null)
    setError(null)
  }

  function handleSelectPlayer(p: PlayerWithDivision) {
    setSelectedPlayer(p)
    setPlayerSearch(`${p.last_name}, ${p.first_name}`)
    setFormGrado(p.grado ?? '')
    setUpdateSchool(false)
    setNewSchool(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!selectedPlayer) {
      setError('Seleccioná un jugador')
      return
    }
    const formData = new FormData(e.currentTarget)
    formData.set('player_id', selectedPlayer.id)
    // Colegio actual para auto-snapshot
    formData.set('current_colegio', selectedPlayer.colegio ?? '')
    // Nuevo colegio si cambió
    if (updateSchool && newSchool) {
      formData.set('new_school_id', newSchool.id)
      formData.set('new_school_name', newSchool.name)
    }
    startTransition(async () => {
      const result = await createInterviewFromTutoras(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        closeModal()
      }
    })
  }

  function handleDelete(interviewId: string, playerId: string) {
    if (!confirm('¿Eliminar esta entrevista?')) return
    startTransition(async () => {
      await deleteInterviewFromTutoras(interviewId, playerId)
    })
  }

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }

  return (
    <div className="space-y-4">
      {/* Botón nueva entrevista */}
      <div className="flex justify-end">
        <button
          onClick={openModal}
          className="px-4 py-2 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 transition-colors"
        >
          + Nueva entrevista
        </button>
      </div>

      {/* Lista de entrevistas */}
      {interviews.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
          No hay entrevistas registradas todavía.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {interviews.map(iv => (
            <div key={iv.id} className="px-5 py-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Link
                    href={`/players/${iv.player_id}`}
                    className="text-sm font-semibold text-gray-900 hover:text-orange-600 transition-colors"
                  >
                    {iv.player_last_name}, {iv.player_first_name}
                  </Link>
                  <span className="text-xs text-gray-400">{formatDate(iv.interview_date)}</span>
                  {iv.interviewer_name && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                      {iv.interviewer_name}
                    </span>
                  )}
                </div>
                {(iv.grado || iv.colegio_snapshot) && (
                  <p className="text-xs text-gray-400 mb-1">
                    {[iv.grado, iv.colegio_snapshot].filter(Boolean).join(' · ')}
                  </p>
                )}
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{iv.notas}</p>
              </div>
              {iv.interviewer_id === currentUserId && (
                <button
                  onClick={() => handleDelete(iv.id, iv.player_id)}
                  disabled={isPending}
                  className="p-1.5 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 disabled:opacity-50"
                  title="Eliminar"
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

      {/* Modal nueva entrevista */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Nueva entrevista</h3>
              <button onClick={closeModal} className="p-1 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Selector de jugador */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Jugador <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={playerSearch}
                    onChange={e => { setPlayerSearch(e.target.value); setSelectedPlayer(null) }}
                    placeholder="Buscar jugador..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    autoComplete="off"
                  />
                  {selectedPlayer && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </span>
                  )}
                </div>
                {playerSearch.trim().length > 0 && !selectedPlayer && (
                  <div className="mt-1 border border-gray-200 rounded-xl bg-white shadow-lg max-h-48 overflow-y-auto">
                    {filteredPlayers.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-3">Sin resultados</p>
                    ) : (
                      filteredPlayers.slice(0, 20).map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectPlayer(p)}
                          className="w-full text-left px-4 py-2.5 hover:bg-orange-50 flex items-center justify-between gap-2"
                        >
                          <span className="text-sm text-gray-800">{p.last_name}, {p.first_name}</span>
                          <span className="text-xs text-gray-400">{p.division_name}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Fecha <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="interview_date"
                  defaultValue={today}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* Grado */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Grado</label>
                <input
                  type="text"
                  name="grado"
                  value={formGrado}
                  onChange={e => setFormGrado(e.target.value)}
                  placeholder="Ej: 3° ESB"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* Colegio — muestra el actual + opción de actualizar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-700">Colegio</label>
                  {selectedPlayer && !updateSchool && (
                    <button
                      type="button"
                      onClick={() => setUpdateSchool(true)}
                      className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                    >
                      Cambió de colegio →
                    </button>
                  )}
                </div>

                {!selectedPlayer ? (
                  <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-400 italic">
                    Seleccioná un jugador primero
                  </div>
                ) : !updateSchool ? (
                  <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700">
                    {selectedPlayer.colegio ?? <span className="text-gray-400 italic">Sin colegio registrado</span>}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <SchoolCombobox
                      schools={schools}
                      value={newSchool}
                      onChange={setNewSchool}
                    />
                    {newSchool && (
                      <p className="text-xs text-orange-700 bg-orange-50 border border-orange-100 rounded-lg px-2.5 py-1.5">
                        Se actualizará el colegio del jugador a <strong>{newSchool.name}</strong>
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => { setUpdateSchool(false); setNewSchool(null) }}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      ✕ Cancelar cambio de colegio
                    </button>
                  </div>
                )}
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Notas <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="notas"
                  required
                  rows={3}
                  placeholder="Resumen de la entrevista..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || !selectedPlayer}
                  className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  {isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
