'use client'

import { useState, useTransition } from 'react'
import { updateUserRole } from '@/app/(app)/admin/actions'

const ROLES = [
  { value: 'coach', label: 'Entrenador' },
  { value: 'tutora', label: 'Tutora' },
  { value: 'admin', label: 'Administrador' },
] as const

type Role = 'admin' | 'coach' | 'tutora'

interface Props {
  coachId: string
  currentRole: Role
  isSelf: boolean  // prevent admin from demoting themselves
}

export function RoleSelector({ coachId, currentRole, isSelf }: Props) {
  const [role, setRole] = useState<Role>(currentRole)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDirty = role !== currentRole

  function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateUserRole(coachId, role)
      if (result?.error) {
        setError(result.error)
      } else {
        setSaved(true)
      }
    })
  }

  if (isSelf) {
    return (
      <p className="text-sm text-gray-400 italic">
        No podés cambiar tu propio rol.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {ROLES.map(r => (
          <button
            key={r.value}
            type="button"
            onClick={() => { setRole(r.value); setSaved(false) }}
            className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
              role === r.value
                ? 'border-green-500 bg-green-50 text-green-800'
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {role === 'coach' && currentRole !== 'coach' && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          ⚠️ Si cambiás a Entrenador, necesitará divisiones asignadas para poder entrar.
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        {saved && !isPending && (
          <span className="text-sm text-green-600 font-medium">✓ Rol actualizado</span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !isDirty}
          className="ml-auto px-6 py-2.5 bg-green-700 hover:bg-green-800 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          {isPending ? 'Guardando...' : 'Guardar rol'}
        </button>
      </div>
    </div>
  )
}
