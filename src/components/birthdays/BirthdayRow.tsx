import { formatWhatsAppNumber } from '@/lib/utils/whatsapp'
import type { BirthdayEntry } from '@/lib/queries/birthdays'

const AVATAR_COLORS = [
  'bg-green-600', 'bg-orange-500', 'bg-blue-500', 'bg-purple-500',
  'bg-rose-500', 'bg-teal-600', 'bg-amber-500', 'bg-cyan-600',
]

function avatarColor(seed: string): string {
  let s = 0
  for (let i = 0; i < seed.length; i++) s += seed.charCodeAt(i)
  return AVATAR_COLORS[s % AVATAR_COLORS.length]
}

function formatWhen(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}

export function BirthdayRow({ entry }: { entry: BirthdayEntry }) {
  const initials = `${entry.first_name[0] ?? ''}${entry.last_name[0] ?? ''}`.toUpperCase()
  const isToday = entry.bucket === 'hoy'
  const ageVerb = entry.bucket === 'semana_pasada' ? 'cumplió' : 'cumple'

  const message = `¡Feliz cumple ${entry.first_name}! 🎉🏉 Saludos de Virreyes Rugby Club.`
  const waHref = entry.parent_phone
    ? `https://wa.me/${formatWhatsAppNumber(entry.parent_phone)}?text=${encodeURIComponent(message)}`
    : null

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 ${isToday ? 'bg-amber-50' : ''}`}>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor(entry.player_id)}`}>
        {initials}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 leading-tight truncate">
          {entry.first_name} {entry.last_name}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
          <span className="inline-block bg-gray-100 text-gray-600 font-semibold text-[10px] px-1.5 py-0.5 rounded">
            {entry.division_name}
          </span>
          {isToday ? (
            <span className="text-orange-600 font-bold">🎂 {ageVerb} {entry.age} hoy</span>
          ) : (
            <>
              <span className="text-gray-400 font-medium">{formatWhen(entry.date)}</span>
              <span className="text-orange-600 font-bold">· {ageVerb} {entry.age}</span>
            </>
          )}
        </p>
      </div>

      {waHref && (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold flex-shrink-0 ${
            isToday ? 'bg-green-700 text-white' : 'bg-white text-green-700 border border-green-700'
          }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a10 10 0 00-8.5 15.3L2 22l4.8-1.4A10 10 0 1012 2z" />
          </svg>
          Saludar
        </a>
      )}
    </div>
  )
}
