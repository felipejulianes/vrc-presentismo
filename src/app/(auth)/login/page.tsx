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
    <div className="relative h-screen overflow-hidden flex flex-col justify-between py-8">

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

      {/* Logo arriba */}
      <div className="relative flex flex-col items-center">
        <Image
          src="/logo.png"
          alt="Virreyes Rugby Club"
          width={280}
          height={280}
          className="object-contain drop-shadow-lg"
          style={{ height: '90px', width: 'auto' }}
          priority
        />
        <p className="text-white/80 text-sm mt-1 tracking-wide drop-shadow">Sistema de Presentismo</p>
      </div>

      {/* Form */}
      <div className="relative w-full max-w-sm mx-auto px-5">
        <form onSubmit={handleSubmit} className="w-full bg-white/95 backdrop-blur rounded-2xl shadow-xl p-5 space-y-3">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1">Email</label>
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
            <label htmlFor="password" className="block text-xs font-medium text-gray-700 mb-1">Contraseña</label>
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
