import Link from 'next/link'

interface Props {
  todayNames: string[]
  weekCount: number
}

/**
 * Tira fina (una línea) para la home de la división.
 * No renderiza nada si no hay cumpleaños cercanos.
 */
export function BirthdaysStrip({ todayNames, weekCount }: Props) {
  if (todayNames.length === 0 && weekCount === 0) return null

  let content: React.ReactNode
  if (todayNames.length > 0) {
    const shown = todayNames.slice(0, 2).join(', ')
    const extra = todayNames.length > 2 ? ` +${todayNames.length - 2}` : ''
    content = (
      <>
        <b className="font-bold text-gray-900">Hoy cumple {shown}{extra}</b>
        {weekCount > 0 && <span className="text-gray-500"> · +{weekCount} esta semana</span>}
      </>
    )
  } else {
    content = (
      <>
        <b className="font-bold text-gray-900">{weekCount}</b>
        <span className="text-gray-500"> {weekCount === 1 ? 'cumpleaños' : 'cumpleaños'} esta semana</span>
      </>
    )
  }

  return (
    <Link
      href="/cumpleanos"
      className="flex items-center gap-2 px-3 py-2 mb-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white text-sm text-gray-700 active:bg-amber-100"
    >
      <span className="text-base leading-none flex-shrink-0">🎂</span>
      <span className="truncate flex-1 min-w-0">{content}</span>
      <span className="text-gray-400 flex-shrink-0">›</span>
    </Link>
  )
}
