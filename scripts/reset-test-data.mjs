import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.')
  process.exit(1)
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const today = new Date().toISOString().slice(0, 10)

async function countRows(table, applyFilter) {
  let query = supabase.from(table).select('*', { count: 'exact', head: true })
  if (applyFilter) query = applyFilter(query)
  const { count, error } = await query
  if (error) throw new Error(`No pude contar ${table}: ${error.message}`)
  return count ?? 0
}

async function deleteRows(table, applyFilter) {
  let query = supabase.from(table).delete()
  if (applyFilter) query = applyFilter(query)
  const { error } = await query
  if (error) throw new Error(`No pude borrar en ${table}: ${error.message}`)
}

const targets = [
  {
    table: 'attendance_records',
    label: 'presentismos',
    filter: q => q.not('session_id', 'is', null),
  },
  {
    table: 'player_documents',
    label: 'documentos de jugadores',
    filter: q => q.not('id', 'is', null),
  },
  {
    table: 'player_notes',
    label: 'notas de jugadores',
    filter: q => q.not('id', 'is', null),
  },
  {
    table: 'player_followups',
    label: 'seguimientos de jugadores',
    filter: q => q.not('id', 'is', null),
  },
  {
    table: 'players',
    label: 'jugadores',
    filter: q => q.not('id', 'is', null),
  },
  {
    table: 'training_sessions',
    label: 'sesiones cargadas/usadas',
    filter: q => q.or(`created_by.not.is.null,session_date.lt.${today}`),
  },
  {
    table: 'tercer_tiempo_visitors',
    label: 'visitantes de tercer tiempo pasados',
    filter: q => q.lt('activity_date', today),
  },
  {
    table: 'tercer_tiempo_reports',
    label: 'reportes de tercer tiempo pasados',
    filter: q => q.lt('activity_date', today),
  },
  {
    table: 'division_activities',
    label: 'partidos/encuentros pasados',
    filter: q => q.lt('activity_date', today),
  },
]

async function main() {
  const before = []
  for (const target of targets) {
    const count = await countRows(target.table, target.filter)
    before.push({ ...target, count })
  }

  console.log('Conteos antes de limpiar:')
  for (const row of before) {
    console.log(`- ${row.label}: ${row.count}`)
  }

  for (const row of before) {
    if (row.count > 0) {
      await deleteRows(row.table, row.filter)
    }
  }

  const after = []
  for (const target of targets) {
    const count = await countRows(target.table, target.filter)
    after.push({ ...target, count })
  }

  console.log('')
  console.log('Conteos después de limpiar:')
  for (const row of after) {
    console.log(`- ${row.label}: ${row.count}`)
  }
}

main().catch(error => {
  console.error(error.message)
  process.exit(1)
})
