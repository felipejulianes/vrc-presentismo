'use client'

import { useRouter } from 'next/navigation'
import type { Division } from '@/types'

const CATEGORY_LABELS: Record<string, string> = {
  prerugby: 'Prerugby',
  infantil: 'Infantil',
  juveniles: 'Juveniles',
}

interface StatsDivisionSelectorProps {
  divisions: Division[]
}

export function StatsDivisionSelector({ divisions }: StatsDivisionSelectorProps) {
  const router = useRouter()

  const grouped = divisions.reduce<Record<string, Division[]>>((acc, d) => {
    if (!acc[d.category]) acc[d.category] = []
    acc[d.category].push(d)
    return acc
  }, {})

  const categories = ['prerugby', 'infantil', 'juveniles'].filter(c => grouped[c]?.length)

  if (divisions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 px-4">
        <p>No tenés divisiones asignadas.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {categories.map(category => (
        <div key={category}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {CATEGORY_LABELS[category]}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {grouped[category].map(division => (
              <button
                key={division.id}
                onClick={() => router.push(`/stats/${division.id}`)}
                className="flex flex-col items-center justify-center py-4 px-2 bg-white border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 rounded-xl transition-colors active:scale-95"
              >
                <span className="text-2xl font-bold text-gray-800">{division.name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
