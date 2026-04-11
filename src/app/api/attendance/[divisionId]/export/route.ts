import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { divisionId: string } }
) {
  const { divisionId } = params
  const supabase = await createClient()

  const [{ data: division }, { data: sessionsRaw }, { data: playersRaw }] = await Promise.all([
    supabase.from('divisions').select('name').eq('id', divisionId).single(),
    supabase
      .from('training_sessions')
      .select('id, session_date')
      .eq('division_id', divisionId)
      .order('session_date', { ascending: true }),
    supabase
      .from('players')
      .select('id, first_name, last_name, inactivo')
      .eq('division_id', divisionId)
      .eq('active', true)
      .order('inactivo')
      .order('last_name'),
  ])

  if (!division) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const sessions = sessionsRaw ?? []
  const players = playersRaw ?? []

  const sessionIds = sessions.map(s => s.id)
  const { data: records } = sessionIds.length > 0
    ? await supabase
        .from('attendance_records')
        .select('session_id, player_id, present')
        .in('session_id', sessionIds)
    : { data: [] }

  // Build lookup
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

  // Build Excel rows — orden: Jugador | Q | % | fechas...
  const header = [
    'Jugador',
    'Q',
    '% Asistencia',
    ...sessions.map(s => s.session_date),
  ]

  const rows = players.map(player => {
    const t = playerTotals[player.id]
    const pct = t.total > 0 ? Math.round((t.present / t.total) * 100) : 0
    const cells: (string | number)[] = [
      `${player.last_name}, ${player.first_name}${player.inactivo ? ' (inactivo)' : ''}`,
      t.present,
      pct,
    ]
    for (const s of sessions) {
      const val = lookup[`${player.id}__${s.id}`]
      cells.push(val === true ? 'P' : val === false ? 'A' : '')
    }
    return cells
  })

  // Footer row with per-session totals
  const perSessionPresent: number[] = sessions.map(s => {
    return (records ?? []).filter(r => r.session_id === s.id && r.present).length
  })
  const perSessionTotal: number[] = sessions.map(s => {
    return (records ?? []).filter(r => r.session_id === s.id).length
  })
  const footerRow = [
    'TOTAL PRESENTES',
    '',
    '',
    ...perSessionPresent.map((p, i) => `${p}/${perSessionTotal[i]}`),
  ]

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(division.name)

  ws.addRow(header)
  ws.addRows(rows)
  ws.addRow(footerRow)

  // Column widths
  ws.getColumn(1).width = 30
  ws.getColumn(2).width = 6
  ws.getColumn(3).width = 12
  sessions.forEach((_, i) => {
    ws.getColumn(4 + i).width = 12
  })

  const buffer = Buffer.from(await wb.xlsx.writeBuffer())

  const filename = `presentismo_${division.name.replace(/\s+/g, '_')}.xlsx`

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
