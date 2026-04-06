'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toggleDoc } from '@/app/(app)/tutoras/actions'
import type { PlayerDocStatus } from '@/lib/queries/docs'
import { DOC_LABELS, ALL_DOC_TYPES } from '@/lib/docs/constants'
import { formatWhatsAppNumber } from '@/lib/utils/whatsapp'
import type { DocType } from '@/lib/docs/constants'

interface Props {
  players: PlayerDocStatus[]
  divisions: { id: string; name: string; sort_order: number }[]
}

export function TutorasDocsTable({ players, divisions }: Props) {
  const [filter, setFilter] = useState<'todos' | 'incompletos'>('incompletos')
  const [divisionFilter, setDivisionFilter] = useState<string>('todas')
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()

  const filtered = players.filter(p => {
    if (divisionFilter !== 'todas' && p.division_id !== divisionFilter) return false
    if (filter === 'incompletos' && p.docs.length === ALL_DOC_TYPES.length) return false
    if (search) {
      const q = search.toLowerCase()
      const name = `${p.first_name} ${p.last_name} ${p.sobrenombre ?? ''}`.toLowerCase()
      if (!name.includes(q)) return false
    }
    return true
  })

  function handleToggle(playerId: string, docType: DocType, received: boolean) {
    startTransition(async () => {
      await toggleDoc(playerId, docType, received)
    })
  }

  const buildWaUrl = (phone: string, name: string) => {
    const num = formatWhatsAppNumber(phone)
    const msg = encodeURIComponent(`Hola, le escribimos del Club Virreyes Rugby. Queríamos recordarle que ${name} tiene documentación pendiente de entregar.`)
    return `https://wa.me/${num}?text=${msg}`
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar jugador..."
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 w-48"
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
        <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
          <button
            onClick={() => setFilter('todos')}
            className={`px-3 py-2 transition-colors ${filter === 'todos' ? 'bg-orange-600 text-white font-medium' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('incompletos')}
            className={`px-3 py-2 transition-colors ${filter === 'incompletos' ? 'bg-orange-600 text-white font-medium' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Incompletos
          </button>
        </div>
        <span className="text-sm text-gray-400">{filtered.length} jugadores</span>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Jugador</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">División</th>
              {ALL_DOC_TYPES.map(dt => (
                <th key={dt} className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  {DOC_LABELS[dt]}
                </th>
              ))}
              <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">WA</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={ALL_DOC_TYPES.length + 4} className="text-center py-10 text-gray-400">
                  No hay jugadores con este filtro
                </td>
              </tr>
            )}
            {filtered.map(p => {
              const allComplete = p.docs.length === ALL_DOC_TYPES.length
              return (
                <tr key={p.player_id} className={`hover:bg-gray-50 transition-colors ${allComplete ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-gray-900">
                      {p.last_name}, {p.first_name}
                    </p>
                    {p.sobrenombre && <p className="text-xs text-gray-400 italic">{p.sobrenombre}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{p.division_name}</td>
                  {ALL_DOC_TYPES.map(dt => {
                    const received = p.docs.includes(dt)
                    return (
                      <td key={dt} className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => handleToggle(p.player_id, dt, received)}
                          disabled={isPending}
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center mx-auto transition-colors ${
                            received
                              ? 'bg-green-500 border-green-500 text-white hover:bg-red-400 hover:border-red-400'
                              : 'border-gray-300 hover:border-orange-400'
                          }`}
                          title={received ? `Quitar ${DOC_LABELS[dt]}` : `Marcar ${DOC_LABELS[dt]} como recibido`}
                        >
                          {received && (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </button>
                      </td>
                    )
                  })}
                  <td className="px-3 py-2.5 text-center">
                    {p.parent_phone ? (
                      <a
                        href={buildWaUrl(p.parent_phone, p.first_name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-7 h-7 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                      </a>
                    ) : (
                      <span className="text-gray-200">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <Link
                      href={`/players/${p.player_id}`}
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
    </div>
  )
}
