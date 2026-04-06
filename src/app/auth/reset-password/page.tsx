'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setError(error.message)
      } else {
        setDone(true)
        setTimeout(() => router.replace('/attendance'), 2000)
      }
    })
  }

  return (
    <div className="relative h-screen overflow-hidden flex flex-col justify-between py-8">
      <Image src="/foto-infantiles.jpg" alt="" fill className="object-cover object-top" priority />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black/90" />

      <div className="relative flex flex-col items-center">
        <Image src="/logo.png" alt="Virreyes Rugby Club" width={280} height={280}
          className="object-contain drop-shadow-lg" style={{ height: '90px', width: 'auto' }} priority />
        <p className="text-white/80 text-sm mt-1 tracking-wide drop-shadow">Sistema de Presentismo</p>
      </div>

      <div className="relative w-full max-w-sm mx-auto px-5">
        {done ? (
          <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl p-6 text-center space-y-2">
            <p className="text-2xl">✅</p>
            <p className="text-base font-semibold text-gray-900">¡Contraseña actualizada!</p>
            <p className="text-sm text-gray-500">Redirigiendo a la app...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white/95 backdrop-blur rounded-2xl shadow-xl p-5 space-y-4">
            <div>
              <p className="text-base font-bold text-gray-900">Nueva contraseña</p>
              <p className="text-xs text-gray-500 mt-0.5">Elegí una contraseña segura para tu cuenta.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nueva contraseña</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Confirmar contraseña</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                autoComplete="new-password"
                placeholder="Repetí la contraseña"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vrc-green"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 bg-vrc-green hover:bg-green-800 disabled:bg-green-400 text-white font-semibold rounded-lg text-sm transition-colors"
            >
              {isPending ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
