export type Division = {
  id: string
  name: string
  category: 'prerugby' | 'infantil' | 'juveniles'
  sort_order: number
  min_age: number | null
  max_age: number | null
  is_juvenile: boolean
}

export type Player = {
  id: string
  first_name: string
  last_name: string
  dni: string | null
  birth_date: string | null
  photo_url: string | null
  division_id: string
  active: boolean
  inactivo: boolean
  parent_name: string | null
  parent_phone: string | null
  sobrenombre: string | null
  fecha_alta: string
  colegio: string | null
  como_conocio: string | null
}

export type TrainingSession = {
  id: string
  division_id: string
  session_date: string
  created_by: string | null
  notes: string | null
}

export type AttendanceRecord = {
  session_id: string
  player_id: string
  present: boolean
}

export type Profile = {
  id: string
  role: 'admin' | 'coach'
  full_name: string
}

// Estado de asistencia local: playerId → presente
export type AttendanceState = Record<string, boolean>
