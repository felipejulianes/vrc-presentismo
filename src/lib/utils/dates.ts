/**
 * Helpers de fechas centralizados — sin imports de Supabase ni side effects.
 * Usable tanto en Server Components como en Client Components.
 */

/**
 * Fecha de hoy en formato ISO YYYY-MM-DD (timezone Argentina / local del servidor).
 */
export function getTodayISO(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Formatear fecha ISO a display corto: "15/03"
 */
export function formatShortDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  return `${d}/${m}`
}

/**
 * Formatear fecha ISO a display completo con día de semana: "lunes 15 de marzo de 2025"
 */
export function formatFullDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Formatear fecha ISO a display con día y mes abreviado: "15 Mar"
 */
export function formatMediumDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * N días atrás en ISO YYYY-MM-DD.
 */
export function daysAgoISO(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}
