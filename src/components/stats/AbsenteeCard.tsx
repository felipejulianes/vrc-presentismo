'use client'

import Image from 'next/image'
import { buildWhatsAppUrl } from '@/lib/utils/whatsapp'
import type { PlayerStat } from '@/lib/queries/stats'

interface AbsenteeCardProps {
  stat: PlayerStat
}

function AttendanceBar({ pct }: { pct: number | null }) {
  const value = pct ?? 0
  const color =
    value >= 75 ? 'bg-green-500' :
    value >= 50 ? 'bg-yellow-400' :
    'bg-red-500'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={`text-xs font-bold w-9 text-right ${
        value >= 75 ? 'text-green-600' :
        value >= 50 ? 'text-yellow-600' :
        'text-red-600'
      }`}>
        {pct !== null ? `${value}%` : '—'}
      </span>
    </div>
  )
}

export function AbsenteeCard({ stat }: AbsenteeCardProps) {
  const fullName = `${stat.first_name} ${stat.last_name}`
  const whatsappUrl = stat.parent_phone
    ? buildWhatsAppUrl(stat.parent_phone, fullName)
    : null

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Foto / Iniciales */}
      <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
        {stat.photo_url ? (
          <Image
            src={stat.photo_url}
            alt={fullName}
            fill
            className="object-cover"
            sizes="40px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-500">
            {stat.first_name[0]}{stat.last_name[0]}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{fullName}</p>
        <div className="mt-1">
          <AttendanceBar pct={stat.attendance_pct} />
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          {stat.sessions_present}/{stat.total_sessions} sesiones
        </p>
      </div>

      {/* Botón WhatsApp */}
      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 w-9 h-9 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-colors"
          aria-label={`Contactar a padre/madre de ${fullName}`}
        >
          <WhatsAppIcon className="w-5 h-5 text-white" />
        </a>
      ) : (
        <div className="w-9 h-9 flex-shrink-0" />
      )}
    </div>
  )
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}
