import { openDB } from 'idb'

const DB_NAME = 'vrc-attendance-queue'
const STORE = 'pending'
const DB_VERSION = 1

export interface QueuedAttendance {
  id: string
  sessionId: string
  divisionId: string
  sessionDate: string
  records: Array<{ playerId: string; present: boolean }>
  queuedAt: number
}

function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    },
  })
}

export async function enqueue(item: Omit<QueuedAttendance, 'id' | 'queuedAt'>): Promise<void> {
  const db = await getDB()
  const id = `${item.divisionId}-${item.sessionDate}`
  await db.put(STORE, { ...item, id, queuedAt: Date.now() })
}

export async function dequeue(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE, id)
}

export async function getAllQueued(): Promise<QueuedAttendance[]> {
  const db = await getDB()
  return db.getAll(STORE)
}

export async function getPendingCount(): Promise<number> {
  const db = await getDB()
  return db.count(STORE)
}
