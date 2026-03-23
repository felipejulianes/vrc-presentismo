'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { receiveDocuments, removeDocument } from '@/app/(app)/docs/actions'
import { buildWhatsAppUrl } from '@/lib/utils/whatsapp'
import type { PlayerDocStatus } from '@/lib/queries/docs'
import type { DocType } from '@/lib/docs/constants'
import { DOC_LABELS, ALL_DOC_TYPES } from '@/lib/docs/constants'
import type { Division } from '@/types'

interface DocsViewProps {
  players: PlayerDocStatus[]
  divisions: Division[]
}

// ── Chip de documento ─────────────────────────────────────
function DocChip({
  label,
  received,
  onRemove,
}: {
  label: string
  received: boolean
  onRemove?: () => void
}) {
  if (received) {
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
        ✓ {label}
        {onRemove && (
          <button
            onClick={onRemove}
            className="ml-0.5 text-green-600 hover:text-red-500"
            title="Quitar"
          >
            ×
          </button>
        )}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
      {label}
    </span>
  )
}

// ── Modal para recepcionar docs ──────────────────────────
function ReceiveModal({
  player,
  onClose,
}: {
  player: PlayerDocStatus
  onClose: () => void
}) {
  const [selected, setSelected] = useState<Set<DocType>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const toggle = (dt: DocType) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(dt)) next.delete(dt)
      else next.add(dt)
      return next
    })
  }

  const missing = ALL_DOC_TYPES.filter(dt => !player.docs.includes(dt))

  const handleSubmit = () => {
    if (selected.size === 0) return
    setError(null)
    startTransition(async () => {
      const res = await receiveDocuments(player.player_id, Array.from(selected))
      if (res?.error) {
        setError(res.error)
      } else {
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-lg bg-white rounded-t-2xl p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 pb-1">
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
            {player.photo_url ? (
              <Image src={player.photo_url} alt="" fill className="object-cover" sizes="40px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-500">
                {player.first_name[0]}{player.last_name[0]}
              </div>
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {player.last_name}, {player.first_name}
            </p>
            <p className="text-xs text-gray-400">{player.division_name}</p>
          </div>
        </div>

        <p className="text-sm font-medium text-gray-700">¿Qué documentos entregó?</p>

        {missing.length === 0 ? (
          <p className="text-sm text-green-700 bg-green-50 rounded-xl px-4 py-3">
            Este jugador ya tiene todos los documentos.
          </p>
        ) : (
          <div className="space-y-2">
            {missing.map(dt => (
              <button
                key={dt}
                onClick={() => toggle(dt)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors ${
                  selected.has(dt)
                    ? 'border-green-500 bg-green-50 text-green-800'
                    : 'border-gray-200 text-gray-700'
                }`}
              >
                <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  selected.has(dt) ? 'border-green-500 bg-green-500' : 'border-gray-300'
                }`}>
                  {selected.has(dt) && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className="text-sm font-medium">{DOC_LABELS[dt]}</span>
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium"
          >
            Cancelar
          </button>
          {missing.length > 0 && (
            <button
              onClick={handleSubmit}
              disabled={isPending || selected.size === 0}
              className="flex-1 py-3 bg-green-700 hover:bg-green-800 disabled:bg-green-300 text-white rounded-xl text-sm font-semibold"
            >
              {isPending ? 'Guardando...' : `Recibir (${selected.size})`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  prerugby: 'Prerugby',
  infantil: 'Infantil',
  juveniles: 'Juveniles',
}

export function DocsView({ players, divisions }: DocsViewProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'incomplete'>('all')
  const [receiveFor, setReceiveFor] = useState<PlayerDocStatus | null>(null)
  const [, startTransition] = useTransition()

  const divisionOrder = divisions.reduce<Record<string, number>>((acc, d) => {
    acc[d.id] = d.sort_order
    return acc
  }, {})

  const divisionCategory = divisions.reduce<Record<string, string>>((acc, d) => {
    acc[d.id] = d.category
    return acc
  }, {})

  const filtered = players.filter(p => {
    const q = search.toLowerCase()
    const matchSearch =
      p.first_name.toLowerCase().includes(q) ||
      p.last_name.toLowerCase().includes(q) ||
      (p.sobrenombre ?? '').toLowerCase().includes(q)
    const matchFilter = filter === 'all' || p.docs.length < 3
    return matchSearch && matchFilter
  })

  const grouped = filtered.reduce<Record<string, PlayerDocStatus[]>>((acc, p) => {
    if (!acc[p.division_id]) acc[p.division_id] = []
    acc[p.division_id].push(p)
    return acc
  }, {})

  const sortedDivisionIds = Object.keys(grouped).sort(
    (a, b) => (divisionOrder[a] ?? 99) - (divisionOrder[b] ?? 99)
  )

  const handleRemove = (player: PlayerDocStatus, dt: DocType) => {
    startTransition(async () => {
      await removeDocument(player.player_id, dt)
    })
  }

  const buildWaMessage = (player: PlayerDocStatus) => {
    const missing = ALL_DOC_TYPES.filter(dt => !player.docs.includes(dt))
    const missingStr = missing.map(dt => DOC_LABELS[dt]).join(', ')
    return `Hola! Soy el entrenador de ${player.first_name} en Virreyes Rugby. Le faltan los siguientes documentos: ${missingStr}. ¿Podría traerlos al próximo entrenamiento? Gracias!`
  }

  return (
    <div className="flex flex-col">
      {/* Buscador + filtro */}
      <div className="px-4 pt-4 pb-3 space-y-2">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar jugador..."
          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${
              filter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('incomplete')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${
              filter === 'incomplete' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            Incompletos
          </button>
        </div>
      </div>

      {/* Lista agrupada por división */}
      {players.length === 0 ? (
        <div className="text-center py-16 text-gray-400 px-4">
          <p>No hay jugadores activos.</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">Sin resultados</p>
      ) : (
        <div className="space-y-4 px-4 pb-4">
          {sortedDivisionIds.map(divId => {
            const divPlayers = grouped[divId]
            const div = divisions.find(d => d.id === divId)
            const categoryLabel = div ? CATEGORY_LABELS[divisionCategory[divId]] : ''

            return (
              <div key={divId}>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-bold text-gray-800">{divPlayers[0].division_name}</span>
                  <span className="text-xs text-gray-400">{categoryLabel}</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {divPlayers.filter(p => p.docs.length === 3).length}/{divPlayers.length} completos
                  </span>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                  {divPlayers.map(player => {
                    const missing = ALL_DOC_TYPES.filter(dt => !player.docs.includes(dt))
                    const complete = missing.length === 0
                    const waUrl = !complete && player.parent_phone
                      ? buildWhatsAppUrl(player.parent_phone, buildWaMessage(player))
                      : null

                    return (
                      <div key={player.player_id} className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          {/* Foto */}
                          <div className="relative w-9 h-9 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                            {player.photo_url ? (
                              <Image src={player.photo_url} alt="" fill className="object-cover" sizes="36px" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                                {player.first_name[0]}{player.last_name[0]}
                              </div>
                            )}
                          </div>

                          {/* Nombre */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {player.last_name}, {player.first_name}
                              {player.sobrenombre ? ` - "${player.sobrenombre}"` : ''}
                            </p>
                          </div>

                          {/* Acciones */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Botón recibir */}
                            {!complete && (
                              <button
                                onClick={() => setReceiveFor(player)}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-green-700 text-white rounded-lg text-xs font-semibold"
                              >
                                + Recibir
                              </button>
                            )}
                            {/* WhatsApp recordatorio */}
                            {waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Chips de documentos */}
                        <div className="flex flex-wrap gap-1.5 mt-2 ml-12">
                          {ALL_DOC_TYPES.map(dt => (
                            <DocChip
                              key={dt}
                              label={DOC_LABELS[dt]}
                              received={player.docs.includes(dt)}
                              onRemove={player.docs.includes(dt) ? () => handleRemove(player, dt) : undefined}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal recepción */}
      {receiveFor && (
        <ReceiveModal
          player={receiveFor}
          onClose={() => setReceiveFor(null)}
        />
      )}
    </div>
  )
}
