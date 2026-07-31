/**
 * Helpers de cumpleaños — puros, sin imports de Supabase.
 * Usable tanto en Server como en Client Components.
 *
 * La clasificación es por semana calendario (lunes a domingo) alrededor de hoy:
 * semana pasada · esta semana · próxima semana, más el bucket 'hoy'.
 */

export type BirthdayBucket = 'hoy' | 'esta_semana' | 'semana_pasada' | 'proxima_semana'

export type BirthdayOccurrence = {
  date: Date        // fecha de la ocurrencia dentro de la ventana
  age: number       // edad que cumple / cumplió en esa ocurrencia
  bucket: BirthdayBucket
  daysFromToday: number
}

function parseISODate(iso: string): Date | null {
  const parts = iso.slice(0, 10).split('-')
  if (parts.length !== 3) return null
  const y = Number(parts[0]), m = Number(parts[1]), d = Number(parts[2])
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function atMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

// Offset al lunes de la semana (lunes = 0 ... domingo = 6)
function mondayOffset(d: Date): number {
  return (d.getDay() + 6) % 7
}

// Ocurrencia del cumpleaños en un año dado (29/02 → 28/02 en años no bisiestos)
function occurrenceInYear(bMonth: number, bDay: number, year: number): Date {
  if (bMonth === 2 && bDay === 29) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
    if (!leap) return new Date(year, 1, 28)
  }
  return new Date(year, bMonth - 1, bDay)
}

/**
 * Devuelve la ocurrencia del cumpleaños dentro de la ventana
 * [lunes de la semana pasada, domingo de la próxima semana] o null.
 */
export function getBirthdayOccurrence(birthISO: string | null, ref: Date): BirthdayOccurrence | null {
  if (!birthISO) return null
  const bd = parseISODate(birthISO)
  if (!bd) return null

  const today = atMidnight(ref)
  const bMonth = bd.getMonth() + 1
  const bDay = bd.getDate()

  const thisMonday = addDays(today, -mondayOffset(today))
  const thisSunday = addDays(thisMonday, 6)
  const windowStart = addDays(thisMonday, -7)   // lunes semana pasada
  const windowEnd = addDays(thisMonday, 13)     // domingo próxima semana

  let occ: Date | null = null
  for (const y of [today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1]) {
    const cand = occurrenceInYear(bMonth, bDay, y)
    if (cand >= windowStart && cand <= windowEnd) { occ = cand; break }
  }
  if (!occ) return null

  let bucket: BirthdayBucket
  if (occ.getTime() === today.getTime()) bucket = 'hoy'
  else if (occ >= thisMonday && occ <= thisSunday) bucket = 'esta_semana'
  else if (occ < thisMonday) bucket = 'semana_pasada'
  else bucket = 'proxima_semana'

  return {
    date: occ,
    age: occ.getFullYear() - bd.getFullYear(),
    bucket,
    daysFromToday: Math.round((occ.getTime() - today.getTime()) / 86400000),
  }
}

/**
 * Etiqueta corta para la grilla de tomar lista: marca al jugador cuyo
 * cumpleaños cae dentro de ±7 días de la fecha de la sesión.
 * Ej: "cumple hoy", "cumple jue", "cumplió mar".
 */
export function birthdayLabelForDate(birthISO: string | null, ref: Date): string | null {
  if (!birthISO) return null
  const bd = parseISODate(birthISO)
  if (!bd) return null

  const today = atMidnight(ref)
  const bMonth = bd.getMonth() + 1
  const bDay = bd.getDate()

  let occ: Date | null = null
  for (const y of [today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1]) {
    const cand = occurrenceInYear(bMonth, bDay, y)
    const diff = Math.round((cand.getTime() - today.getTime()) / 86400000)
    if (diff >= -7 && diff <= 7) { occ = cand; break }
  }
  if (!occ) return null

  const diff = Math.round((occ.getTime() - today.getTime()) / 86400000)
  if (diff === 0) return 'cumple hoy'
  const dow = occ.toLocaleDateString('es-AR', { weekday: 'short' })
  return diff < 0 ? `cumplió ${dow}` : `cumple ${dow}`
}
