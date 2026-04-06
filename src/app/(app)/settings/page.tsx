import { createClient } from '@/lib/supabase/server'
import { ChangePasswordForm } from '@/components/settings/ChangePasswordForm'
import Link from 'next/link'
import { logout } from '@/app/(auth)/login/actions'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user!.id)
    .single()

  const roleLabel: Record<string, string> = {
    admin: 'Administrador',
    coach: 'Entrenador',
    tutora: 'Tutora / Coordinadora',
  }

  return (
    <div className="p-4 space-y-6 max-w-md">
      <div className="flex items-center gap-3">
        <Link href="/more" className="p-1 text-gray-500">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mi cuenta</h1>
        </div>
      </div>

      {/* Datos de cuenta */}
      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-vrc-green flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-base">
              {profile?.full_name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{profile?.full_name ?? '—'}</p>
            <p className="text-xs text-gray-400">{user?.email}</p>
          </div>
          {profile?.role && (
            <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {roleLabel[profile.role] ?? profile.role}
            </span>
          )}
        </div>
      </div>

      {/* Cambiar contraseña */}
      <ChangePasswordForm />

      {/* Cerrar sesión */}
      <form action={logout}>
        <button type="submit"
          className="w-full py-3 text-sm font-medium text-red-500 hover:text-red-700 border border-red-200 rounded-xl transition-colors">
          Cerrar sesión
        </button>
      </form>
    </div>
  )
}
