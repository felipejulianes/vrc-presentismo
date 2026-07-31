import Link from 'next/link'

export default function MorePage() {
  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Más</h1>
        <p className="text-sm text-gray-500">Recursos y herramientas</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        <Link
          href="/cumpleanos"
          className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 active:bg-gray-100"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🎂</span>
            <div>
              <p className="text-sm font-medium text-gray-900">Cumpleaños</p>
              <p className="text-xs text-gray-400">Quién cumple esta semana</p>
            </div>
          </div>
          <ChevronIcon />
        </Link>

        <Link
          href="/ayuda"
          className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 active:bg-gray-100"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">📖</span>
            <div>
              <p className="text-sm font-medium text-gray-900">Guía de uso</p>
              <p className="text-xs text-gray-400">Cómo usar la app</p>
            </div>
          </div>
          <ChevronIcon />
        </Link>

        <Link
          href="/settings"
          className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 active:bg-gray-100"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">👤</span>
            <div>
              <p className="text-sm font-medium text-gray-900">Mi cuenta</p>
              <p className="text-xs text-gray-400">Cambiar contraseña</p>
            </div>
          </div>
          <ChevronIcon />
        </Link>

        <Link
          href="/clubs"
          className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 active:bg-gray-100"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🏟️</span>
            <div>
              <p className="text-sm font-medium text-gray-900">Clubes rivales</p>
              <p className="text-xs text-gray-400">Direcciones, sedes y contactos</p>
            </div>
          </div>
          <ChevronIcon />
        </Link>

        <Link
          href="/wiki"
          className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 active:bg-gray-100"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">📋</span>
            <div>
              <p className="text-sm font-medium text-gray-900">Reglamento</p>
              <p className="text-xs text-gray-400">Reglas por categoría — Infantil y Pre Juvenil</p>
            </div>
          </div>
          <ChevronIcon />
        </Link>
      </div>
    </div>
  )
}

function ChevronIcon() {
  return (
    <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}
