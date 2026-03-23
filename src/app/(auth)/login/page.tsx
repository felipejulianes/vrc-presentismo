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
    <div className="relative min-h-screen flex items-end justify-center">

      {/* Foto de fondo */}
      <Image
        src="/foto-infantiles.jpg"
        alt="Virreyes Rugby Club"
        fill
        className="object-cover object-top"
        priority
      />

      {/* Overlay verde oscuro degradado */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />

      {/* Contenido */}
      <div className="relative w-full max-w-sm px-5 pb-10 flex flex-col items-center">

        {/* Logo */}
        <div className="mb-6 flex flex-col items-center">
          <Image
            src="/logo.png"
            alt="Virreyes Rugby Club"
            width={160}
            height={120}
            className="object-contain drop-shadow-lg"
            priority
          />
          <p className="text-white/80 text-sm mt-2 tracking-wide">Sistema de Presentismo</p>
        </div>

        {/* Form */}
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
