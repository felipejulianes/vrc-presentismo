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
  parent_name_2: string | null
  parent_phone_2: string | null
  sobrenombre: string | null
  fecha_alta: string
  colegio: string | null
  school_id: string | null
  como_conocio: string | null
  grado: string | null
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
  role: 'admin' | 'coach' | 'tutora'
  full_name: string
}

export type PlayerInterview = {
  id: string
  player_id: string
  interview_date: string
  interviewer_id: string | null
  interviewer_name: string | null
  grado: string | null
  colegio_snapshot: string | null
  notas: string
  created_at: string
}

export type SchoolVisit = {
  id: string
  school_id: string
  school_name?: string
  visit_date: string
  status: 'planificada' | 'realizada' | 'cancelada'
  division_ids: string[]
  notas: string | null
  created_by: string | null
  created_at: string
}

// Estado de asistencia local: playerId → presente
export type AttendanceState = Record<string, boolean>
