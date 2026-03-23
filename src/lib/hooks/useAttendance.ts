'use client'

import { useState, useCallback } from 'react'
import type { AttendanceState } from '@/types'

interface UseAttendanceOptions {
  initialState: AttendanceState
  divisionId: string
  date: string
}

export function useAttendance({ initialState, divisionId, date }: UseAttendanceOptions) {
  const [attendance, setAttendance] = useState<AttendanceState>(initialState)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = useCallback((playerId: string) => {
    setAttendance(prev => ({ ...prev, [playerId]: !prev[playerId] }))
    setSaved(false)
  }, [])

  const save = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ divisionId, date, attendance }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al guardar')
      }
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }, [attendance, divisionId, date])

  const presentCount = Object.values(attendance).filter(Boolean).length

  return { attendance, toggle, save, saving, saved, error, presentCount }
}
