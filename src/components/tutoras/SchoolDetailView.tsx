'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { updateVisitStatus, deleteSchoolVisit } from '@/app/(app)/tutoras/actions'
import type { SchoolPlayerRow } from '@/lib/queries/schoolVisits'
import type { SchoolVisit } from '@/types'
import { formatWhatsAppNumber } from '@/lib/utils/whatsapp'

interface Props {
  schoolId: string
  schoolName: string
  players: SchoolPlayerRow[]
  visits: SchoolVisit[]
  divisions: { id: string; name: string; sort_order: number }[]
}

export function SchoolDetailView({ schoolId, players, visits, divisions }: Props) {
  const [isPending, startTransition] = useTransition()

  const today = new Date().toISOString().split('T')[0]

  // Agrupar jugadores por división
  const playersByDiv: Record<string, SchoolPlayerRow[]> = {}
  for (const p of players) {
    if (!playersByDiv[p.division_id]) playersByDiv[p.division_id] = []
    playersByDiv[p.division_id].push(p)
  }

  const divisionsWithPlayers = divisions.filter(d => playersByDiv[d.id]?.length > 0)

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }

  const buildWaUrl = (phone: string) => {
    const num = formatWhatsAppNumber(phone)
    return `https://wa.me/${num}`
  }

  const statusLabel = (status: string) => {
    if (status === 'planificada') return { text: 'Planificada', cls: 'bg-blue-100 text-blue-700' }
    if (status === 'realizada') return { text: 'Realizada', cls: 'bg-green-100 text-green-700' }
    return { text: 'Cancelada', cls: 'bg-gray-100 text-gray-500' }
  }

  function handleStatusChange(visitId: string, newStatus: 'planificada' | 'realizada' | 'cancelada') {
    startTransition(async () => {
      await updateVisitStatus(visitId, newStatus, schoolId)
    })
  }

  function handleDeleteVisit(visitId: string) {
    if (!confirm('¿Eliminar esta visita?')) return
    startTransition(async () => {
      await deleteSchoolVisit(visitId, schoolId)
    })
  }

  return (
    <div className="space-y-6">
      {/* Jugadores por división */}
      {divisionsWithPlayers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          No hay jugadores activos de este colegio
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Jugadores por división</h2>
          {divisionsWithPlayers.map(div => (
            <div key={div.id} className="bg-white rounded-xl border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">{div.name}</h3>
                <span className="text-xs text-gray-400">{playersByDiv[div.id].length} jugadores</span>
              </div>
              <div className="divide-y divide-gray-50">
                {playersByDiv[div.id].map(p => (
                  <div key={p.player_id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {p.last_name}, {p.first_name}
                        {p.sobrenombre && <span className="text-gray-400 font-normal italic ml-1">&quot;{p.sobrenombre}&quot;</span>}
                      </p>
                      {p.grado && (
                        <p className="text-xs text-gray-400">{p.grado}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {p.parent_phone && (
                        <a
                          href={buildWaUrl(p.parent_phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title={`WhatsApp a ${p.parent_name || 'referente'}`}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                          </svg>
                        </a>
                      )}
                      <Link
                        href={`/players/${p.player_id}`}
                        className="p-1.5 text-gray-400 hover:text-orange-600 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Visitas */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Historial de visitas
        </h2>
        {visits.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-400 text-sm">
            No hay visitas registradas para este colegio.{' '}
            <Link href="/tutoras/schools" className="text-orange-600 hover:underline">Crear una visita</Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {visits.map(v => {
              const { text, cls } = statusLabel(v.status)
              const isPast = v.visit_date < today && v.status === 'planificada'
              return (
                <div key={v.id} className="flex items-start gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">{formatDate(v.visit_date)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isPast ? 'bg-amber-100 text-amber-700' : cls}`}>
                        {isPast ? 'Atrasada' : text}
                      </span>
                    </div>
                    {v.notas && <p className="text-sm text-gray-500 mt-0.5">{v.notas}</p>}
                    {v.division_ids?.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        Divisiones: {v.division_ids.map(id =>
                          divisions.find(d => d.id === id)?.name ?? '?'
                        ).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {v.status === 'planificada' && (
                      <button
                        onClick={() => handleStatusChange(v.id, 'realizada')}
                        disabled={isPending}
                        className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2.5 py-1 rounded-lg font-medium disabled:opacity-50 transition-colors"
                      >
                        Marcar realizada
                      </button>
                    )}
                    {v.status === 'realizada' && (
                      <span className="text-xs text-green-600 font-medium">✓ Realizada</span>
                    )}
                    <button
                      onClick={() => handleDeleteVisit(v.id)}
                      disabled={isPending}
                      className="p-1.5 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
