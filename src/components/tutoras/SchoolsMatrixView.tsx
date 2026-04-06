'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createSchoolVisit } from '@/app/(app)/tutoras/actions'
import type { SchoolMatrixRow } from '@/lib/queries/schoolVisits'
import type { SchoolVisit } from '@/types'

interface Props {
  matrix: SchoolMatrixRow[]
  visits: (SchoolVisit & { school_name: string })[]
  divisions: { id: string; name: string; sort_order: number }[]
  allSchools: { id: string; name: string }[]
}

export function SchoolsMatrixView({ matrix, visits, divisions, allSchools }: Props) {
  const [highlightZero, setHighlightZero] = useState(false)
  const [showVisitModal, setShowVisitModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [visitError, setVisitError] = useState<string | null>(null)
  const [selectedDivs, setSelectedDivs] = useState<string[]>([])

  const today = new Date().toISOString().split('T')[0]
  const upcomingVisits = visits.filter(v => v.status === 'planificada')

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }

  const statusLabel = (status: string) => {
    if (status === 'planificada') return { text: 'Planificada', cls: 'bg-blue-100 text-blue-700' }
    if (status === 'realizada') return { text: 'Realizada', cls: 'bg-green-100 text-green-700' }
    return { text: 'Cancelada', cls: 'bg-gray-100 text-gray-500' }
  }

  function handleCreateVisit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setVisitError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('division_ids', selectedDivs.join(','))
    startTransition(async () => {
      const result = await createSchoolVisit(formData)
      if (result?.error) {
        setVisitError(result.error)
      } else {
        setShowVisitModal(false)
        setSelectedDivs([])
        ;(e.target as HTMLFormElement).reset()
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Acciones */}
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={() => setHighlightZero(h => !h)}
          className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
            highlightZero
              ? 'bg-amber-100 border-amber-300 text-amber-700'
              : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {highlightZero ? 'Ocultando presencia' : 'Destacar sin presencia'}
        </button>
        <button
          onClick={() => setShowVisitModal(true)}
          className="px-3 py-2 rounded-lg text-sm font-semibold bg-orange-600 text-white hover:bg-orange-700 transition-colors"
        >
          + Nueva visita
        </button>
      </div>

      {/* Matriz colegio × división */}
      {matrix.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap sticky left-0 bg-white z-10">
                  Colegio
                </th>
                {divisions.map(d => (
                  <th key={d.id} className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap min-w-[60px]">
                    {d.name}
                  </th>
                ))}
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {matrix.map(row => {
                const total = Object.values(row.divisions).reduce((a, b) => a + b, 0)
                return (
                  <tr key={row.school_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-gray-900 sticky left-0 bg-white whitespace-nowrap">
                      {row.school_name}
                    </td>
                    {divisions.map(d => {
                      const count = row.divisions[d.id] ?? 0
                      const isZero = count === 0
                      return (
                        <td key={d.id} className="px-3 py-2.5 text-center">
                          <Link
                            href={`/tutoras/schools/${row.school_id}?div=${d.id}`}
                            className={`inline-flex items-center justify-center w-8 h-7 rounded-md font-semibold transition-colors ${
                              isZero && highlightZero
                                ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                                : count > 0
                                ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                : 'text-gray-300 hover:bg-gray-100'
                            }`}
                          >
                            {count || '—'}
                          </Link>
                        </td>
                      )
                    })}
                    <td className="px-3 py-2.5 text-center font-semibold text-gray-700">{total}</td>
                    <td className="px-3 py-2.5 text-center">
                      <Link
                        href={`/tutoras/schools/${row.school_id}`}
                        className="text-xs text-gray-400 hover:text-orange-600 transition-colors"
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Visitas planificadas */}
      {upcomingVisits.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Visitas planificadas</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {upcomingVisits.map(v => {
              const { cls } = statusLabel(v.status)
              const isPast = v.visit_date < today
              return (
                <Link
                  key={v.id}
                  href={`/tutoras/schools/${v.school_id}`}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{v.school_name}</p>
                    {v.notas && <p className="text-xs text-gray-400 truncate">{v.notas}</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                    isPast ? 'bg-amber-100 text-amber-700' : cls
                  }`}>
                    {formatDate(v.visit_date)}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal nueva visita */}
      {showVisitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowVisitModal(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Nueva visita a colegio</h3>
              <button onClick={() => setShowVisitModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateVisit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Colegio <span className="text-red-500">*</span></label>
                <select
                  name="school_id"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="">Seleccionar colegio...</option>
                  {allSchools.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fecha <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  name="visit_date"
                  required
                  defaultValue={today}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Divisiones objetivo</label>
                <div className="flex flex-wrap gap-2">
                  {divisions.map(d => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setSelectedDivs(prev =>
                        prev.includes(d.id) ? prev.filter(id => id !== d.id) : [...prev, d.id]
                      )}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                        selectedDivs.includes(d.id)
                          ? 'bg-orange-100 border-orange-300 text-orange-700'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {d.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  name="notas"
                  rows={2}
                  placeholder="Objetivo de la visita, responsable..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                />
              </div>

              {visitError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{visitError}</p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowVisitModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  {isPending ? 'Guardando...' : 'Crear visita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
