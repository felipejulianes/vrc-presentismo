'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { login, sendPasswordReset } from './actions'

type Mode = 'login' | 'forgot'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [isPending, startTransition] = useTransition()

  // ── Login ──────────────────────────────────────────────────────────────────
  function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await login(formData)
      if (result?.error) {
        setError(result.error === 'Invalid login credentials'
          ? 'Email o contraseña incorrectos.'
          : result.error)
      }
    })
  }

  // ── Forgot password ────────────────────────────────────────────────────────
  function handleForgot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const email = (new FormData(e.currentTarget).get('email') as string)?.trim()
    if (!email) return
    startTransition(async () => {
      const result = await sendPasswordReset(email)
      if (result?.error) {
        setError(result.error)
      } else {
        setResetSent(true)
      }
    })
  }

  // ── Google OAuth ───────────────────────────────────────────────────────────
  async function handleGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="relative h-screen overflow-hidden flex flex-col justify-between py-8">

      {/* Fondo */}
      <Image src="/foto-infantiles.jpg" alt="Virreyes Rugby Club"
        fill className="object-cover object-top" priority />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black/90" />

      {/* Logo */}
      <div className="relative flex flex-col items-center">
        <Image src="/logo.png" alt="Virreyes Rugby Club" width={280} height={280}
          className="object-contain drop-shadow-lg" style={{ height: '90px', width: 'auto' }} priority />
        <p className="text-white/80 text-sm mt-1 tracking-wide drop-shadow">Sistema de Presentismo</p>
      </div>

      {/* Card */}
      <div className="relative w-full max-w-sm mx-auto px-5">
        <div className="w-full bg-white/95 backdrop-blur rounded-2xl shadow-xl p-5">

          {/* ── MODO LOGIN ── */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input id="email" name="email" type="email" required autoComplete="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
                  placeholder="entrenador@vrc.com" />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-medium text-gray-700 mb-1">Contraseña</label>
                <input id="password" name="password" type="password" required autoComplete="current-password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
                  placeholder="••••••••" />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}

              <button type="submit" disabled={isPending}
                className="w-full py-2.5 bg-vrc-green hover:bg-green-800 disabled:bg-green-400 text-white font-semibold rounded-lg text-sm transition-colors">
                {isPending ? 'Ingresando...' : 'Ingresar'}
              </button>

              {/* Divisor */}
              <div className="flex items-center gap-2 py-1">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">o</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Google */}
              <button type="button" onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-sm font-medium text-gray-700 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continuar con Google
              </button>

              {/* Olvidé contraseña */}
              <button type="button" onClick={() => { setMode('forgot'); setError(null) }}
                className="w-full text-center text-xs text-gray-500 hover:text-vrc-green transition-colors py-1">
                ¿Olvidaste tu contraseña?
              </button>
            </form>
          )}

          {/* ── MODO FORGOT ── */}
          {mode === 'forgot' && (
            <div className="space-y-4">
              {resetSent ? (
                <div className="text-center space-y-3 py-2">
                  <p className="text-3xl">📧</p>
                  <p className="text-base font-semibold text-gray-900">Revisá tu email</p>
                  <p className="text-sm text-gray-500">
                    Si tu cuenta existe, vas a recibir un link para restablecer tu contraseña.
                  </p>
                  <button onClick={() => { setMode('login'); setResetSent(false); setError(null) }}
                    className="text-sm text-vrc-green font-semibold hover:underline">
                    ← Volver al login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgot} className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-0.5">Restablecer contraseña</p>
                    <p className="text-xs text-gray-500">Ingresá tu email y te mandamos un link para crear una nueva.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                    <input name="email" type="email" required autoComplete="email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
                      placeholder="entrenador@vrc.com" />
                  </div>

                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                  )}

                  <button type="submit" disabled={isPending}
                    className="w-full py-2.5 bg-vrc-green hover:bg-green-800 disabled:bg-green-400 text-white font-semibold rounded-lg text-sm transition-colors">
                    {isPending ? 'Enviando...' : 'Enviar link'}
                  </button>

                  <button type="button" onClick={() => { setMode('login'); setError(null) }}
                    className="w-full text-center text-xs text-gray-500 hover:text-vrc-green transition-colors py-1">
                    ← Volver al login
                  </button>
                </form>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
