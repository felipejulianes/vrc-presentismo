'use client'

import { useState, useTransition } from 'react'
import { updateCoachDivisions } from '@/app/(app)/admin/actions'
import type { Division } from '@/types'

const CATEGORY_LABELS: Record<string, string> = {
  prerugby: 'Prerugby',
  infantil: 'Infantil',
  juveniles: 'Juveniles',
}

interface DivisionAssignerProps {
  coachId: string
  allDivisions: Division[]
  assignedIds: string[]
}

export function DivisionAssigner({ coachId, allDivisions, assignedIds }: DivisionAssignerProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(assignedIds))
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = (id: string) => {
    setSaved(false)
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  const handleSave = () => {
    setError(null)
    startTransition(async () => {
      const result = await updateCoachDivisions(coachId, Array.from(selected))
      if (result?.error) {
        setError(result.error)
      } else {
        setSaved(true)
      }
    })
  }

  const grouped = allDivisions.reduce<Record<string, Division[]>>((acc, d) => {
    if (!acc[d.category]) acc[d.category] = []
    acc[d.category].push(d)
    return acc
  }, {})

  const categories = ['prerugby', 'infantil', 'juveniles'].filter(c => grouped[c]?.length)

  return (
    <div className="space-y-4">
      {categories.map(category => (
        <div key={category}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {CATEGORY_LABELS[category]}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {grouped[category].map(division => {
              const isSelected = selected.has(division.id)
              return (
                <button
                  key={division.id}
                  type="button"
                  onClick={() => toggle(division.id)}
                  className={`py-3 rounded-xl border-2 text-lg font-bold transition-all active:scale-95 ${
                    isSelected
                      ? 'border-green-500 bg-green-50 text-green-800'
                      : 'border-gray-200 bg-white text-gray-500'
                  }`}
                >
                  {division.name}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        {saved && !isPending && (
          <span className="text-sm text-green-600 font-medium">✓ Guardado</span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="ml-auto px-6 py-2.5 bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          {isPending ? 'Guardando...' : 'Guardar divisiones'}
        </button>
      </div>
    </div>
  )
}
