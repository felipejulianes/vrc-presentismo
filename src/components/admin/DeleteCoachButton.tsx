'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteCoach } from '@/app/(app)/admin/actions'

interface DeleteCoachButtonProps {
  coachId: string
  coachName: string
}

export function DeleteCoachButton({ coachId, coachName }: DeleteCoachButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (!confirm(`¿Eliminar a ${coachName}? Esta acción no se puede deshacer.`)) return

    startTransition(async () => {
      const result = await deleteCoach(coachId)
      if (!result?.error) {
        router.push('/admin/coaches')
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="w-full py-2.5 text-sm text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
    >
      {isPending ? 'Eliminando...' : 'Eliminar usuario'}
    </button>
  )
}
