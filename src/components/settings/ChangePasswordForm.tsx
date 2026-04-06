'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

export function ChangePasswordForm() {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 6) { setError('Mínimo 6 caracteres.'); return }
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return }

    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setError(error.message)
      } else {
        setDone(true)
        setPassword('')
        setConfirm('')
        setTimeout(() => { setDone(false); setOpen(false) }, 2500)
      }
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setError(null) }}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          <p className="text-sm font-medium text-gray-900">Cambiar contraseña</p>
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 py-4">
          {done ? (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">¡Contraseña actualizada!</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
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
              <div className="flex gap-2">
                <button type="submit" disabled={isPending}
                  className="flex-1 py-2 bg-vrc-green hover:bg-green-800 disabled:bg-green-400 text-white font-semibold rounded-lg text-sm transition-colors">
                  {isPending ? 'Guardando...' : 'Guardar'}
                </button>
                <button type="button" onClick={() => { setOpen(false); setError(null) }}
                  className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm">
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
