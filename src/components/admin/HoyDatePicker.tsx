'use client'

import { useRouter } from 'next/navigation'

interface Props {
  value: string // YYYY-MM-DD
}

export function HoyDatePicker({ value }: Props) {
  const router = useRouter()

  return (
    <input
      type="date"
      value={value}
      onChange={e => {
        if (e.target.value) router.push(`/admin/hoy?date=${e.target.value}`)
      }}
      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green bg-white"
    />
  )
}
