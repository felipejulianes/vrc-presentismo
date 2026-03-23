'use client'

import { useRouter } from 'next/navigation'

interface Props {
  value: string // YYYY-MM-DD
  onChangePath?: string // prefix for navigation, e.g. '/admin/sabados' → '/admin/sabados/2025-03-01'
                        // if omitted, appends ?date= to current path
}

export function HoyDatePicker({ value, onChangePath }: Props) {
  const router = useRouter()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.value) return
    if (onChangePath) {
      router.push(`${onChangePath}/${e.target.value}`)
    } else {
      router.push(`?date=${e.target.value}`)
    }
  }

  return (
    <input
      type="date"
      value={value}
      onChange={handleChange}
      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green bg-white"
    />
  )
}
