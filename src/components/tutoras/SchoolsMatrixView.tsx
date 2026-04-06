'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createSchoolVisit } from '@/app/(app)/tutoras/actions'
import { updateSchool, mergeSchools, createSchool } from '@/app/(app)/admin/schools/actions'
import type { SchoolMatrixRow } from '@/lib/queries/schoolVisits'
import type { SchoolWithCount } from '@/lib/queries/schools'
import type { SchoolVisit } from '@/types'

interface Props {
  matrix: SchoolMatrixRow[]
  visits: (SchoolVisit & { school_name: string })[]
  divisions: { id: string; name: string; sort_order: number }[]
  schoolsWithCount: SchoolWithCount[]
}

export function SchoolsMatrixView({ matrix, visits, divisions, schoolsWithCount }: Props) {
  const [activeTab, setActiveTab] = useState<'presencia' | 'catalogo'>('presencia')

  // Derivar lista simple para el modal de visitas
  const allSchools = schoolsWithCount.filter(s => s.active).map(s => ({ id: s.id, name: s.name }))

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('presencia')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'presencia'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Presencia y visitas
        </button>
        <button
          onClick={() => setActiveTab('catalogo')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'catalogo'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Catálogo
        </button>
      </div>

      {activeTab === 'presencia' && (
        <PresenciaTab
          matrix={matrix}
          visits={visits}
          divisions={divisions}
          allSchools={allSchools}
        />
      )}

      {activeTab === 'catalogo' && (
        <CatalogoTab schools={schoolsWithCount} />
      )}
    </div>
  )
}

// ─── Tab Presencia ─────────────────────────────────────────────────────────

interface PresenciaProps {
  matrix: SchoolMatrixRow[]
  visits: (SchoolVisit & { school_name: string })[]
  divisions: { id: string; name: string; sort_order: number }[]
  allSchools: { id: string; name: string }[]
}

function PresenciaTab({ matrix, visits, divisions, allSchools }: PresenciaProps) {
  const [highlightZero, setHighlightZero] = useState(false)
  const [showVisitModal, setShowVisitModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [visitError, setVisitError] = useState<string | null>(null)
  const [selectedDivs, setSelectedDivs] = useState<string[]>([])

  const today = new Date().toISOString().split('T')[0]
  const upcomingVisits = visits.filter(v => v.status === 'planificada')
  const realizadasVisits = visits.filter(v => v.status === 'realizada')

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
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
                    isPast ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {formatDate(v.visit_date)}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Visitas realizadas */}
      {realizadasVisits.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Visitas realizadas</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {realizadasVisits.map(v => (
              <Link
                key={v.id}
                href={`/tutoras/schools/${v.school_id}`}
                className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{v.school_name}</p>
                  {v.notas && <p className="text-xs text-gray-400 truncate">{v.notas}</p>}
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 bg-green-100 text-green-700">
                  {formatDate(v.visit_date)}
                </span>
              </Link>
            ))}
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

// ─── Tab Catálogo ──────────────────────────────────────────────────────────

interface CatalogoProps {
  schools: SchoolWithCount[]
}

function CatalogoTab({ schools: initialSchools }: CatalogoProps) {
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
    <div className="space-y-4 max-w-2xl">
      <p className="text-sm text-gray-500">
        {active.length} colegios activos · Editá nombres, aliases de búsqueda, fusioná duplicados o desactivá entradas obsoletas.
      </p>

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

      {/* Lista de colegios activos */}
      <div className="space-y-2">
        {active.map(school => (
          <SchoolCatalogRow
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

      {/* Colegios desactivados */}
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

function SchoolCatalogRow({
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
        <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors" title="Editar nombre y aliases">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a4 4 0 01-1.414.793l-3 .75.75-3a4 4 0 01.793-1.414z" />
          </svg>
        </button>
        <button onClick={onStartMerge} className="p-1.5 text-gray-400 hover:text-amber-600 transition-colors" title="Fusionar con otro colegio">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </button>
        <button onClick={onDeactivate} className="p-1.5 text-gray-400 hover:text-red-400 transition-colors" title="Desactivar colegio">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
