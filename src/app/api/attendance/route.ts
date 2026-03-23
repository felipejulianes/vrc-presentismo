import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { AttendanceState } from '@/types'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body = await request.json()
  const { divisionId, date, attendance } = body as {
    divisionId: string
    date: string
    attendance: AttendanceState
  }

  if (!divisionId || !date || !attendance) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  // Crear o recuperar la sesión de entrenamiento
  const { data: session, error: sessionError } = await supabase
    .from('training_sessions')
    .upsert(
      { division_id: divisionId, session_date: date, created_by: user.id },
      { onConflict: 'division_id,session_date' }
    )
    .select('id')
    .single()

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 })
  }

  // Upsert de todos los registros de asistencia
  const records = Object.entries(attendance).map(([playerId, present]) => ({
    session_id: session.id,
    player_id: playerId,
    present,
  }))

  if (records.length === 0) {
    return NextResponse.json({ success: true, sessionId: session.id })
  }

  const { error: attendanceError } = await supabase
    .from('attendance_records')
    .upsert(records, { onConflict: 'session_id,player_id' })

  if (attendanceError) {
    return NextResponse.json({ error: attendanceError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, sessionId: session.id })
}
