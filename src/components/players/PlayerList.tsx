'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Player, Division } from '@/types'
import { buildWhatsAppUrl } from '@/lib/utils/whatsapp'

type PlayerWithDivision = Player & { division_name: string }

interface PlayerListProps {
  players: PlayerWithDivision[]
  divisions: Division[]
}

const CATEGORY_LABELS: Record<string, string> = {
  prerugby: 'Prerugby',
  infantil: 'Infantil',
  juveniles: 'Juveniles',
}

function formatBirthYear(birth_date: string | null): string | null {
  if (!birth_date) return null
  return birth_date.slice(0, 4)
}

export function PlayerList({ players, divisions }: PlayerListProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return players.filter(p =>
      p.first_name.toLowerCase().includes(q) ||
      p.last_name.toLowerCase().includes(q) ||
      (p.dni ?? '').includes(q) ||
      (p.sobrenombre ?? '').toLowerCase().includes(q)
    )
  }, [players, search])

  const divisionOrder = useMemo(
    () => divisions.reduce<Record<string, number>>((acc, d) => {
      acc[d.id] = d.sort_order
      return acc
    }, {}),
    [divisions]
  )

  const { grouped, sortedDivisionIds } = useMemo(() => {
    const g = filtered.reduce<Record<string, PlayerWithDivision[]>>((acc, p) => {
      const key = p.division_id
      if (!acc[key]) acc[key] = []
      acc[key].push(p)
      return acc
    }, {})

    // Sort: activos primero, luego inactivos; dentro de cada grupo: apellido
    for (const divId of Object.keys(g)) {
      g[divId].sort((a, b) => {
        if (a.inactivo !== b.inactivo) return a.inactivo ? 1 : -1
        return a.last_name.localeCompare(b.last_name)
      })
    }

    const ids = Object.keys(g).sort(
      (a, b) => (divisionOrder[a] ?? 99) - (divisionOrder[b] ?? 99)
    )

    return { grouped: g, sortedDivisionIds: ids }
  }, [filtered, divisionOrder])

  return (
    <div className="flex flex-col">
      {/* Buscador */}
      <div className="px-4 pt-4 pb-3">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, apodo o DNI..."
          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {players.length === 0 ? (
        <div className="text-center py-16 text-gray-400 px-4">
          <p className="text-lg mb-1">No hay jugadores aún</p>
          <p className="text-sm">Tocá el botón + para agregar el primero</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">Sin resultados para &quot;{search}&quot;</p>
      ) : (
        <div className="space-y-4 px-4 pb-4">
          {sortedDivisionIds.map(divId => {
            const divPlayers = grouped[divId]
            const divName = divPlayers[0].division_name
            const div = divisions.find(d => d.id === divId)
            const categoryLabel = div ? CATEGORY_LABELS[div.category] : ''
            const activeCount = divPlayers.filter(p => !p.inactivo).length

            return (
              <div key={divId}>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-bold text-gray-800">{divName}</span>
                  <span className="text-xs text-gray-400">{categoryLabel}</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {activeCount} activos
                    {divPlayers.length > activeCount && ` · ${divPlayers.length - activeCount} inactivos`}
                  </span>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                  {divPlayers.map(player => {
                    const waUrl = player.parent_phone
                      ? buildWhatsAppUrl(player.parent_phone, `Hola, soy el entrenador de ${player.first_name}`)
                      : null
                    const telUrl = player.parent_phone
                      ? `tel:${player.parent_phone}`
                      : null
                    const birthYear = formatBirthYear(player.birth_date)

                    return (
                      <div
                        key={player.id}
                        className={`flex items-center gap-3 px-3 py-2.5 ${player.inactivo ? 'opacity-60' : ''}`}
                      >
                        {/* Foto / Iniciales */}
                        <Link href={`/players/${player.id}`} className="flex-shrink-0">
                          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-100">
                            {player.photo_url ? (
                              <Image
                                src={player.photo_url}
                                alt={`${player.first_name} ${player.last_name}`}
                                fill
                                className="object-cover"
                                sizes="40px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-500">
                                {player.first_name[0]}{player.last_name[0]}
                              </div>
                            )}
                          </div>
                        </Link>

                        {/* Info */}
                        <Link href={`/players/${player.id}`} className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {player.last_name}, {player.first_name}
                            {player.sobrenombre ? ` - "${player.sobrenombre}"` : ''}
                            {player.inactivo && (
                              <span className="ml-1.5 text-xs font-normal text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">inactivo</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {player.dni ? `DNI ${player.dni}` : ''}
                            {birthYear ? `${player.dni ? ' · ' : ''}${birthYear}` : ''}
                          </p>
                        </Link>

                        {/* Acciones */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Editar */}
                          <Link
                            href={`/players/${player.id}/edit`}
                            className="p-2 text-gray-400 hover:text-green-700 rounded-lg hover:bg-green-50"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>

                          {/* WhatsApp */}
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                              </svg>
                            </a>
                          )}

                          {/* Teléfono */}
                          {telUrl && (
                            <a
                              href={telUrl}
                              className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z" />
                              </svg>
                            </a>
                          )}
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
    </div>
  )
}
