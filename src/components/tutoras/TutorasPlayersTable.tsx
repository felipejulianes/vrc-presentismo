'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { updatePlayerGradoColegio } from '@/app/(app)/tutoras/actions'
import type { Player, Division } from '@/types'

type PlayerWithDivision = Player & { division_name: string }

interface Props {
  players: PlayerWithDivision[]
  divisions: Division[]
}

export function TutorasPlayersTable({ players, divisions }: Props) {
  const [search, setSearch] = useState('')
  const [divisionFilter, setDivisionFilter] = useState<string>('todas')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editGrado, setEditGrado] = useState('')
  const [editColegio, setEditColegio] = useState('')
  const [isPending, startTransition] = useTransition()

  const filtered = players.filter(p => {
    if (divisionFilter !== 'todas' && p.division_id !== divisionFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const name = `${p.first_name} ${p.last_name} ${p.sobrenombre ?? ''} ${p.dni ?? ''}`.toLowerCase()
      if (!name.includes(q)) return false
    }
    return true
  })

  function startEdit(p: PlayerWithDivision) {
    setEditingId(p.id)
    setEditGrado(p.grado ?? '')
    setEditColegio(p.colegio ?? '')
  }

  function cancelEdit() {
    setEditingId(null)
  }

  function saveEdit(playerId: string) {
    startTransition(async () => {
      await updatePlayerGradoColegio(playerId, editGrado.trim() || null, editColegio.trim() || null)
      setEditingId(null)
    })
  }

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, apodo, DNI..."
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 w-64"
        />
        <select
          value={divisionFilter}
          onChange={e => setDivisionFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          <option value="todas">Todas las divisiones</option>
          {divisions.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <span className="text-sm text-gray-400">{filtered.length} jugadores</span>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-8"></th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Jugador</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">División</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Colegio</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Grado</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Nacimiento</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Alta</th>
              <th className="px-3 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-10 text-gray-400">No hay jugadores con este filtro</td>
              </tr>
            )}
            {filtered.map(p => {
              const isEditing = editingId === p.id
              return (
                <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${p.inactivo ? 'opacity-50' : ''}`}>
                  {/* Foto */}
                  <td className="pl-4 py-2.5">
                    <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-bold text-gray-400">
                      {p.photo_url ? (
                        <Image src={p.photo_url} alt="" width={32} height={32} className="object-cover w-full h-full" />
                      ) : (
                        `${p.first_name[0]}${p.last_name[0]}`
                      )}
                    </div>
                  </td>

                  {/* Nombre */}
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-gray-900">{p.last_name}, {p.first_name}</p>
                    {p.sobrenombre && <p className="text-xs text-gray-400 italic">{p.sobrenombre}</p>}
                    {p.inactivo && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 rounded">Inactivo</span>}
                  </td>

                  {/* División */}
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{p.division_name}</td>

                  {/* Colegio — editable */}
                  <td className="px-4 py-2.5">
                    {isEditing ? (
                      <input
                        value={editColegio}
                        onChange={e => setEditColegio(e.target.value)}
                        className="w-full px-2 py-1 border border-orange-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
                        placeholder="Colegio"
                        autoFocus
                      />
                    ) : (
                      <span className="text-gray-700">{p.colegio ?? <span className="text-gray-300">—</span>}</span>
                    )}
                  </td>

                  {/* Grado — editable */}
                  <td className="px-4 py-2.5">
                    {isEditing ? (
                      <input
                        value={editGrado}
                        onChange={e => setEditGrado(e.target.value)}
                        className="w-28 px-2 py-1 border border-orange-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
                        placeholder="Ej: 3° ESB"
                      />
                    ) : (
                      <span className="text-gray-700">{p.grado ?? <span className="text-gray-300">—</span>}</span>
                    )}
                  </td>

                  {/* Nacimiento */}
                  <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap hidden lg:table-cell">{formatDate(p.birth_date)}</td>

                  {/* Alta */}
                  <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap hidden lg:table-cell">{formatDate(p.fecha_alta)}</td>

                  {/* Acciones */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2 justify-end">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => saveEdit(p.id)}
                            disabled={isPending}
                            className="text-xs bg-orange-600 text-white px-2.5 py-1 rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium"
                          >
                            {isPending ? '...' : 'Guardar'}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-xs text-gray-400 hover:text-gray-600 px-1.5 py-1"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(p)}
                            className="text-xs text-gray-400 hover:text-orange-600 transition-colors p-1"
                            title="Editar colegio y grado"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                          </button>
                          <Link
                            href={`/players/${p.id}`}
                            className="text-xs text-gray-400 hover:text-orange-600 transition-colors p-1"
                            title="Ver ficha completa"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                            </svg>
                          </Link>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
