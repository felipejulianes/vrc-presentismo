'use client'

import { useState, useTransition } from 'react'
import { executeProgression } from '@/app/(app)/admin/actions'

type PreviewRow = {
  current_division: string
  next_division: string
  player_count: number
}

interface ProgressionPreviewProps {
  preview: PreviewRow[]
}

type Step = 'idle' | 'confirm1' | 'confirm2' | 'done'

export function ProgressionPreview({ preview }: ProgressionPreviewProps) {
  const [step, setStep] = useState<Step>('idle')
  const [result, setResult] = useState<{ moved: number; deactivated: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const totalPlayers = preview.reduce((sum, r) => sum + Number(r.player_count), 0)
  const rowsWithPlayers = preview.filter(r => Number(r.player_count) > 0)

  const handleExecute = () => {
    setError(null)
    startTransition(async () => {
      const res = await executeProgression()
      if (res?.error) {
        setError(res.error)
        setStep('idle')
      } else {
        setResult(res.result as { moved: number; deactivated: number })
        setStep('done')
      }
    })
  }

  if (step === 'done' && result) {
    return (
      <div className="p-4 space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center space-y-2">
          <div className="text-4xl">✅</div>
          <h2 className="text-lg font-bold text-green-800">Avance ejecutado</h2>
          <p className="text-sm text-green-700">
            <span className="font-semibold">{result.moved}</span> jugadores avanzaron de categoría
          </p>
          {result.deactivated > 0 && (
            <p className="text-sm text-green-700">
              <span className="font-semibold">{result.deactivated}</span> jugadores de M19 pasaron a alumni
            </p>
          )}
        </div>
        <p className="text-xs text-gray-400 text-center">
          Recargá la app para ver los cambios reflejados en todas las pantallas.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-5">

      {/* Advertencia */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Operación irreversible</p>
        <p className="text-sm text-amber-700">
          Esta acción mueve a <strong>todos</strong> los jugadores activos a la siguiente categoría.
          Los jugadores de M19 quedan dados de baja. No se puede deshacer.
        </p>
      </div>

      {/* Preview tabla */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-2">
          Vista previa — {totalPlayers} jugadores totales
        </h2>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-3 px-4 py-2 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-semibold text-gray-500">División actual</span>
            <span className="text-xs font-semibold text-gray-500 text-center">→</span>
            <span className="text-xs font-semibold text-gray-500 text-right">Nueva división</span>
          </div>
          <div className="divide-y divide-gray-100">
            {rowsWithPlayers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No hay jugadores para avanzar.</p>
            ) : (
              rowsWithPlayers.map(row => (
                <div key={row.current_division} className="grid grid-cols-3 items-center px-4 py-3">
                  <div>
                    <span className="text-sm font-bold text-gray-800">{row.current_division}</span>
                    <span className="text-xs text-gray-400 ml-1">({Number(row.player_count)})</span>
                  </div>
                  <div className="text-center text-gray-400">→</div>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${
                      row.next_division === 'alumni (baja)' ? 'text-red-500' : 'text-green-700'
                    }`}>
                      {row.next_division}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Flujo de confirmación en dos pasos */}
      {step === 'idle' && (
        <button
          onClick={() => setStep('confirm1')}
          disabled={rowsWithPlayers.length === 0}
          className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-xl transition-colors"
        >
          Ejecutar avance de categoría
        </button>
      )}

      {step === 'confirm1' && (
        <div className="space-y-3 bg-amber-50 border border-amber-300 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 text-center">
            ¿Estás seguro? Esta acción afecta a {totalPlayers} jugadores.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setStep('idle')}
              className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={() => setStep('confirm2')}
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold"
            >
              Sí, continuar
            </button>
          </div>
        </div>
      )}

      {step === 'confirm2' && (
        <div className="space-y-3 bg-red-50 border border-red-300 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-800 text-center">
            Última confirmación. No se puede deshacer.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setStep('idle')}
              className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleExecute}
              disabled={isPending}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl text-sm font-semibold"
            >
              {isPending ? 'Ejecutando...' : 'Confirmar y ejecutar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
