'use client'

import Image from 'next/image'
import type { Player } from '@/types'

interface PlayerCardProps {
  player: Player
  present: boolean
  onToggle: () => void
  birthdayLabel?: string
}

export function PlayerCard({ player, present, onToggle, birthdayLabel }: PlayerCardProps) {
  const initials = `${player.first_name[0]}${player.last_name[0]}`.toUpperCase()

  return (
    <button
      onClick={onToggle}
      className={`relative flex flex-col items-center p-2 rounded-xl border-2 transition-all active:scale-95 select-none ${
        present
          ? 'border-green-500 bg-green-50'
          : birthdayLabel
          ? 'border-amber-400 bg-amber-50'
          : 'border-gray-200 bg-white'
      }`}
    >
      {birthdayLabel && (
        <span
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center text-xs shadow"
          title={birthdayLabel}
        >
          🎂
        </span>
      )}
      {/* Foto / Iniciales */}
      <div className="relative w-16 h-16 rounded-full overflow-hidden mb-1.5">
        {player.photo_url ? (
          <Image
            src={player.photo_url}
            alt={`${player.first_name} ${player.last_name}`}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center text-xl font-bold ${
              present ? 'bg-green-200 text-green-800' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {initials}
          </div>
        )}

        {/* Checkmark overlay cuando está presente */}
        {present && (
          <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-600 drop-shadow"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Nombre */}
      <span className={`text-xs font-semibold text-center leading-tight ${
        present ? 'text-green-800' : 'text-gray-700'
      }`}>
        {player.first_name}
      </span>
      <span className={`text-xs text-center leading-tight ${
        present ? 'text-green-600' : 'text-gray-400'
      }`}>
        {player.last_name}
      </span>
      {player.sobrenombre && (
        <span className={`text-[10px] text-center leading-tight italic ${
          present ? 'text-green-500' : 'text-gray-300'
        }`}>
          &ldquo;{player.sobrenombre}&rdquo;
        </span>
      )}
      {birthdayLabel && (
        <span className="text-[9px] font-bold text-orange-600 leading-tight mt-0.5 text-center">
          {birthdayLabel}
        </span>
      )}
    </button>
  )
}
