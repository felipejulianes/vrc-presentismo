import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

interface PageProps {
  params: { divisionId: string }
  searchParams: Promise<{ tipo?: string }>
}

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'numeric' })
}

export default async function AttendanceTablaPage({ params, searchParams }: PageProps) {
  const { divisionId } = params
  const { tipo } = await searchParams
  const sessionType = tipo === 'semana' ? 'semana' : tipo === 'todo' ? 'todo' : 'sabado'

  const supabase = await createClient()

  let sessionsQuery = supabase
    .from('training_sessions')
    .select('id, session_date')
    .eq('division_id', divisionId)
    .lte('session_date', new Date().toISOString().split('T')[0])
    .order('session_date', { ascending: true })
    .limit(10000)

  if (sessionType !== 'todo') {
    sessionsQuery = sessionsQuery.eq('session_type', sessionType)
  }

  const [{ data: division }, { data: sessionsRaw }, { data: playersRaw }] = await Promise.all([
    supabase.from('divisions').select('id, name').eq('id', divisionId).single(),
    sessionsQuery,
    supabase
      .from('players')
      .select('id, first_name, last_name, inactivo')
      .eq('division_id', divisionId)
      .eq('active', true)
      .order('inactivo')
      .order('last_name'),
  ])

  if (!division) notFound()

  const sessions = sessionsRaw ?? []
  const players = playersRaw ?? []

  if (sessions.length === 0 || players.length === 0) {
    return (
      <div className="pb-6">
        <div className="px-4 pt-4 pb-3 flex items-center gap-2">
          <Link href={`/attendance/${divisionId}`} className="p-1 text-gray-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">{division.name} — Tabla</h1>
        </div>
        <div className="text-center py-16 text-gray-400 px-4">
          <p>No hay datos suficientes para mostrar la tabla.</p>
        </div>
      </div>
    )
  }

  // Fetch all attendance records for these sessions
  const sessionIds = sessions.map(s => s.id)
  const { data: records } = await supabase
    .from('attendance_records')
    .select('session_id, player_id, present')
    .in('session_id', sessionIds)
    .limit(10000)

  // Build lookup: playerid+sessionid → present
  const lookup: Record<string, boolean | null> = {}
  for (const r of records ?? []) {
    lookup[`${r.player_id}__${r.session_id}`] = r.present
  }

  // Per-player totals
  const playerTotals: Record<string, { present: number; total: number }> = {}
  for (const p of players) playerTotals[p.id] = { present: 0, total: 0 }
  for (const r of records ?? []) {
    if (playerTotals[r.player_id]) {
      playerTotals[r.player_id].total++
      if (r.present) playerTotals[r.player_id].present++
    }
  }

  // Per-session totals
  const sessionTotals: Record<string, { present: number; total: number }> = {}
  for (const s of sessions) sessionTotals[s.id] = { present: 0, total: 0 }
  for (const r of records ?? []) {
    if (sessionTotals[r.session_id]) {
      sessionTotals[r.session_id].total++
      if (r.present) sessionTotals[r.session_id].present++
    }
  }

  const exportUrl = `/api/attendance/${divisionId}/export`

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-2">
        <Link href={`/attendance/${divisionId}`} className="p-1 text-gray-500">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{division.name}</h1>
          <p className="text-sm text-gray-500">{players.length} jugadores · {sessions.length} entrenamientos</p>
          {/* Tipo filter */}
          <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5 mt-1 w-fit">
            {(['sabado', 'semana', 'todo'] as const).map(t => (
              <Link
                key={t}
                href={`/attendance/${divisionId}/tabla${t !== 'sabado' ? `?tipo=${t}` : ''}`}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-all ${
                  sessionType === t
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'sabado' ? 'Sáb' : t === 'semana' ? 'Semana' : 'Todo'}
              </Link>
            ))}
          </div>
        </div>
        <a
          href={exportUrl}
          className="flex items-center gap-1.5 px-3 py-2 bg-green-700 text-white rounded-xl text-sm font-semibold"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Excel
        </a>
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto px-4">
        <table className="min-w-max text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="sticky left-0 bg-gray-50 z-10 px-3 py-2 text-left font-semibold text-gray-700 border border-gray-200 min-w-[140px]">
                Jugador
              </th>
              <th className="px-3 py-2 text-center font-semibold text-gray-700 border border-gray-200 min-w-[40px]">
                Q
              </th>
              <th className="px-3 py-2 text-center font-semibold text-gray-700 border border-gray-200 min-w-[50px]">
                %
              </th>
              {sessions.map(s => (
                <th
                  key={s.id}
                  className="px-2 py-2 text-center font-medium text-gray-600 border border-gray-200 min-w-[52px] whitespace-nowrap"
                  title={s.session_date}
                >
                  {fmtDate(s.session_date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map((player, pi) => {
              const totals = playerTotals[player.id]
              const pct = totals.total > 0 ? Math.round((totals.present / totals.total) * 100) : null
              const pctColor = pct === null ? 'text-gray-400' : pct >= 75 ? 'text-green-700' : pct >= 50 ? 'text-yellow-600' : 'text-red-600'

              return (
                <tr key={player.id} className={pi % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className={`sticky left-0 z-10 px-3 py-1.5 font-medium border border-gray-200 ${pi % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${player.inactivo ? 'text-gray-400' : 'text-gray-800'}`}>
                    {player.last_name}, {player.first_name}
                    {player.inactivo && <span className="ml-1 text-gray-300">(inactivo)</span>}
                  </td>
                  <td className="px-3 py-1.5 text-center font-medium border border-gray-200 text-gray-700">
                    {totals.present}
                  </td>
                  <td className={`px-3 py-1.5 text-center font-bold border border-gray-200 ${pctColor}`}>
                    {pct !== null ? `${pct}%` : '—'}
                  </td>
                  {sessions.map(s => {
                    const val = lookup[`${player.id}__${s.id}`]
                    return (
                      <td key={s.id} className="px-2 py-1.5 text-center border border-gray-200">
                        {val === true ? (
                          <span className="text-green-600 font-bold">✓</span>
                        ) : val === false ? (
                          <span className="text-red-400">✗</span>
                        ) : (
                          <span className="text-gray-200">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100">
              <td className="sticky left-0 bg-gray-100 z-10 px-3 py-1.5 font-semibold text-gray-700 border border-gray-200 text-xs">
                Presentes
              </td>
              <td className="border border-gray-200" />
              <td className="border border-gray-200" />
              {sessions.map(s => {
                const t = sessionTotals[s.id]
                return (
                  <td key={s.id} className="px-2 py-1.5 text-center border border-gray-200 font-medium text-gray-600">
                    {t.present}/{t.total}
                  </td>
                )
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
