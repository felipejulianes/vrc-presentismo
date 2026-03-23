'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { login } from './actions'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setError(null)

    startTransition(async () => {
      const result = await login(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="relative min-h-screen flex flex-col">

      {/* Foto de fondo */}
      <Image
        src="/foto-infantiles.jpg"
        alt="Virreyes Rugby Club"
        fill
        className="object-cover object-top"
        priority
      />

      {/* Overlay: arriba casi nada, abajo oscuro */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black/90" />

      {/* Logo arriba — sobre la parte más clara de la foto */}
      <div className="relative flex flex-col items-center pt-16 pb-4">
        <Image
          src="/logo.png"
          alt="Virreyes Rugby Club"
          width={200}
          height={200}
          className="object-contain brightness-0 invert drop-shadow-lg"
          style={{ height: '110px', width: 'auto' }}
          priority
        />
        <p className="text-white/80 text-sm mt-2 tracking-wide drop-shadow">Sistema de Presentismo</p>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Form abajo */}
      <div className="relative w-full max-w-sm mx-auto px-5 pb-10">
        <form onSubmit={handleSubmit} className="w-full bg-white/95 backdrop-blur rounded-2xl shadow-xl p-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green focus:border-transparent"
              placeholder="entrenador@vrc.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error === 'Invalid login credentials'
                ? 'Email o contraseña incorrectos'
                : error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 px-4 bg-vrc-green hover:bg-green-800 disabled:bg-green-400 text-white font-semibold rounded-lg text-sm transition-colors"
          >
            {isPending ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
