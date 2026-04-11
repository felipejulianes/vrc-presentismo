'use client'

import { useState, useCallback, useEffect } from 'react'
import type { AttendanceState } from '@/types'
import { enqueue, dequeue, getAllQueued, getPendingCount } from '@/lib/offline/attendanceQueue'

interface UseAttendanceOptions {
  initialState: AttendanceState
  divisionId: string
  date: string
}

async function sendAttendance(payload: {
  divisionId: string
  date: string
  attendance: AttendanceState
}): Promise<string> {
  const res = await fetch('/api/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Error al guardar')
  }
  const data = await res.json()
  return data.sessionId as string
}

export function useAttendance({ initialState, divisionId, date }: UseAttendanceOptions) {
  const [attendance, setAttendance] = useState<AttendanceState>(initialState)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingCount, setPendingCount] = useState(0)

  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCount()
    setPendingCount(count)
  }, [])

  const drainQueue = useCallback(async () => {
    const queued = await getAllQueued()
    for (const item of queued) {
      try {
        const attendanceState: AttendanceState = {}
        for (const r of item.records) {
          attendanceState[r.playerId] = r.present
        }
        await sendAttendance({
          divisionId: item.divisionId,
          date: item.sessionDate,
          attendance: attendanceState,
        })
        await dequeue(item.id)
      } catch {
        // Keep item in queue — will retry next time online
      }
    }
    await refreshPendingCount()
  }, [refreshPendingCount])

  // Drain queue on mount and whenever we come back online
  useEffect(() => {
    refreshPendingCount()
    drainQueue()

    const handleOnline = () => drainQueue()
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [drainQueue, refreshPendingCount])

  const toggle = useCallback((playerId: string) => {
    setAttendance(prev => ({ ...prev, [playerId]: !prev[playerId] }))
    setSaved(false)
  }, [])

  const save = useCallback(async () => {
    setSaving(true)
    setError(null)

    const records = Object.entries(attendance).map(([playerId, present]) => ({
      playerId,
      present,
    }))

    // Always enqueue first to guarantee persistence
    await enqueue({ divisionId, sessionDate: date, sessionId: '', records })

    try {
      await sendAttendance({ divisionId, date, attendance })
      // Success — remove from queue
      const id = `${divisionId}-${date}`
      await dequeue(id)
      setSaved(true)
    } catch {
      // Item stays in queue, will drain on reconnect
      setError('Sin conexión — se guardará cuando haya red')
    } finally {
      setSaving(false)
      await refreshPendingCount()
    }
  }, [attendance, divisionId, date, refreshPendingCount])

  const presentCount = Object.values(attendance).filter(Boolean).length

  return { attendance, toggle, save, saving, saved, error, presentCount, pendingCount }
}
