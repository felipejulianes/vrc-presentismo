import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { HoyDatePicker } from '@/components/admin/HoyDatePicker'

function getDateISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

interface PageProps {
  searchParams: { date?: string }
}

interface DivisionRow {
  id: string
  name: string
  sort_order: number
}

interface SessionRow {
  id: string
  division_id: string
}

interface AttendanceRow {
  session_id: string
  present: boolean
}

export default async function AdminHoyPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const today = getDateISO(new Date())
  const date = searchParams.date ?? today
  const isToday = date === today

  const [{ data: divisions }, { data: sessions }] = await Promise.all([
    supabase.from('divisions').select('id, name, sort_order').order('sort_order'),
    supabase
      .from('training_sessions')
      .select('id, division_id')
      .eq('session_date', date),
  ])

  const allDivisions: DivisionRow[] = divisions ?? []
  const daySessions: SessionRow[] = sessions ?? []

  const sessionByDiv: Record<string, string> = {}
  for (const s of daySessions) {
    sessionByDiv[s.division_id] = s.id
  }

  let attendance: AttendanceRow[] = []
  if (daySessions.length > 0) {
    const sessionIds = daySessions.map(s => s.id)
    const { data } = await supabase
      .from('attendance_records')
      .select('session_id, present')
      .in('session_id', sessionIds)
    attendance = data ?? []
  }

  const countBySession: Record<string, { present: number; total: number }> = {}
  for (const s of daySessions) {
    countBySession[s.id] = { present: 0, total: 0 }
  }
  for (const r of attendance) {
    if (countBySession[r.session_id]) {
      countBySession[r.session_id].total++
      if (r.present) countBySession[r.session_id].present++
    }
  }

  let grandPresent = 0
  let grandTotal = 0
  for (const sid of Object.keys(countBySession)) {
    grandPresent += countBySession[sid].present
    grandTotal += countBySession[sid].total
  }

  const activeDivisionsCount = daySessions.length

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-2">
        <Link href="/admin" className="p-1 text-gray-500">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">
            {isToday ? 'Hoy' : 'Asistencia del día'}
          </h1>
          <p className="text-sm text-gray-500 capitalize">{formatDisplayDate(date)}</p>
        </div>
        <HoyDatePicker value={date} />
      </div>

      {/* Grand total card */}
      {activeDivisionsCount > 0 ? (
        <div className="mx-4 mb-4 bg-vrc-green rounded-2xl p-4 text-white">
          <p className="text-sm font-medium opacity-80">
            {isToday ? 'Total en entrenamientos hoy' : 'Total en entrenamientos ese día'}
          </p>
          <p className="text-4xl font-bold mt-1">
            {grandPresent}
            <span className="text-xl font-medium opacity-70">/{grandTotal}</span>
          </p>
          <p className="text-sm opacity-70 mt-1">
            {activeDivisionsCount} {activeDivisionsCount === 1 ? 'división' : 'divisiones'} con entrenamiento
          </p>
          {grandTotal > 0 && (
            <div className="mt-3 h-2 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{ width: `${Math.round((grandPresent / grandTotal) * 100)}%` }}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="mx-4 mb-4 bg-gray-100 rounded-2xl p-5 text-center">
          <p className="text-gray-500 font-medium">Sin entrenamientos registrados</p>
          <p className="text-sm text-gray-400 mt-1">
            {isToday ? 'Los entrenadores aún no tomaron lista' : 'No hubo lista registrada ese día'}
          </p>
        </div>
      )}

      {/* Per-division list */}
      <div className="px-4 space-y-2">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Por división</h2>
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {allDivisions.map(div => {
            const sid = sessionByDiv[div.id]
            const counts = sid ? countBySession[sid] : null
            const pct = counts && counts.total > 0
              ? Math.round((counts.present / counts.total) * 100)
              : null

            return (
              <div key={div.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{div.name}</p>
                  {counts ? (
                    <p className="text-xs text-gray-400">{counts.present}/{counts.total} presentes</p>
                  ) : (
                    <p className="text-xs text-gray-300">Sin entrenamiento</p>
                  )}
                </div>

                {counts && pct !== null ? (
                  <div className="flex items-center gap-2 w-28">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-600 w-8 text-right">{pct}%</span>
                  </div>
                ) : (
                  <div className="w-28 flex justify-end">
                    <span className="text-xs text-gray-300">—</span>
                  </div>
                )}

                {sid ? (
                  <Link
                    href={`/attendance/${div.id}/${sid}`}
                    className="shrink-0 p-1.5 text-gray-400 hover:text-vrc-green"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ) : (
                  <div className="w-7" />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
