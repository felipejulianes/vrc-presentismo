/**
 * Formatea un número argentino para usar en wa.me
 * Formato destino: 549XXXXXXXXXX (sin 0 inicial ni 15)
 */
export function formatWhatsAppNumber(phone: string): string {
  // Limpiar todo lo que no sea número
  let digits = phone.replace(/\D/g, '')

  // Si ya tiene código de país 54
  if (digits.startsWith('54')) {
    digits = digits.slice(2)
  }

  // Quitar 0 inicial (código de área con 0)
  if (digits.startsWith('0')) {
    digits = digits.slice(1)
  }

  // Quitar 15 al principio del número de celular
  if (digits.startsWith('15')) {
    digits = digits.slice(2)
  }

  return `549${digits}`
}

export function buildWhatsAppUrl(phone: string, playerName: string): string {
  const number = formatWhatsAppNumber(phone)
  const message = encodeURIComponent(
    `Hola! Te escribimos desde Virreyes Rugby Club sobre la asistencia de ${playerName}. ¿Podemos hablar?`
  )
  return `https://wa.me/${number}?text=${message}`
}
