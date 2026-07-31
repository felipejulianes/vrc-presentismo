import { BirthdayRow } from './BirthdayRow'
import type { BirthdayEntry, BirthdayBucket } from '@/lib/queries/birthdays'

const BUCKET_ORDER: BirthdayBucket[] = ['hoy', 'esta_semana', 'proxima_semana', 'semana_pasada']
const BUCKET_LABELS: Record<BirthdayBucket, string> = {
  hoy: 'Hoy',
  esta_semana: 'Esta semana',
  proxima_semana: 'Próxima semana',
  semana_pasada: 'Semana pasada',
}

export function BirthdaysView({ isAdmin, entries }: { isAdmin: boolean; entries: BirthdayEntry[] }) {
  return (
    <div className="flex flex-col min-h-full">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-gray-900">{isAdmin ? 'Cumpleaños del club' : 'Cumpleaños'}</h1>
        <p className="text-sm text-gray-500">
          {isAdmin ? 'Todas las divisiones · esta semana y alrededor' : 'Tus divisiones · esta semana y alrededor'}
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-4 text-gray-400">
          <span className="text-4xl mb-2">🎂</span>
          <p className="text-sm">No hay cumpleaños en las semanas cercanas.</p>
        </div>
      ) : isAdmin ? (
        <AdminGroups entries={entries} />
      ) : (
        <BucketSections entries={entries} />
      )}

      <div className="h-6" />
    </div>
  )
}

function BucketSections({ entries }: { entries: BirthdayEntry[] }) {
  return (
    <div className="px-4 space-y-4">
      {BUCKET_ORDER.map(bucket => {
        const rows = entries.filter(e => e.bucket === bucket)
        if (rows.length === 0) return null
        return (
          <div key={bucket}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{BUCKET_LABELS[bucket]}</p>
            <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
              {rows.map(e => <BirthdayRow key={e.player_id} entry={e} />)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AdminGroups({ entries }: { entries: BirthdayEntry[] }) {
  const byDivision = new Map<string, BirthdayEntry[]>()
  for (const e of entries) {
    const list = byDivision.get(e.division_id) ?? []
    list.push(e)
    byDivision.set(e.division_id, list)
  }
  const groups = Array.from(byDivision.values()).sort((a, b) => a[0].division_sort - b[0].division_sort)

  return (
    <div className="px-4 space-y-3">
      {groups.map(rows => (
        <div key={rows[0].division_id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-bold text-white bg-vrc-green px-2 py-0.5 rounded">{rows[0].division_name}</span>
            <span className="ml-auto text-xs text-gray-400 font-semibold">{rows.length}</span>
          </div>
          <div className="divide-y divide-gray-100">
            {rows.map(e => <BirthdayRow key={e.player_id} entry={e} />)}
          </div>
        </div>
      ))}
    </div>
  )
}
