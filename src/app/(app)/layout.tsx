import Image from 'next/image'
import Link from 'next/link'
import { logout } from '@/app/(auth)/login/actions'
import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/layout/BottomNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user?.id)
    .single()

  // --- Access guard ---
  // Users with full access (admin, tutora) always pass through.
  // Coaches need at least one division assigned.
  // If no profile exists at all (shouldn't happen after migration 032, but
  // kept as a safety net), we also show the pending screen.
  const isFullAccess = profile?.role === 'admin' || profile?.role === 'tutora'

  if (!isFullAccess) {
    let hasDivisions = false

    if (profile?.role === 'coach') {
      const { count } = await supabase
        .from('coach_divisions')
        .select('*', { count: 'exact', head: true })
        .eq('coach_id', user?.id)
      hasDivisions = (count ?? 0) > 0
    }

    if (!hasDivisions) {
      return (
        <div className="flex flex-col min-h-screen bg-gray-50">
          {/* Top bar — same as normal layout so the user can log out */}
          <header className="sticky top-0 z-40 bg-vrc-green text-white px-4 py-1.5 flex items-center justify-between shadow">
            <Link href="/">
              <Image
                src="/isotipo.png"
                alt="Virreyes Rugby Club"
                width={200}
                height={133}
                className="brightness-0 invert"
                style={{ height: '34px', width: 'auto' }}
                priority
              />
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-sm text-green-100 hidden sm:block">
                {profile?.full_name ?? user?.email}
              </span>
              <form action={logout}>
                <button type="submit" className="text-xs text-green-200 hover:text-white">
                  Salir
                </button>
              </form>
            </div>
          </header>

          {/* Pending screen */}
          <main className="flex-1 flex items-center justify-center px-6">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                Cuenta pendiente de activación
              </h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                {profile?.full_name
                  ? `Hola ${profile.full_name.split(' ')[0]},`
                  : 'Hola,'}{' '}
                tu cuenta fue creada pero todavía no tiene divisiones asignadas.
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Un administrador del club tiene que activarte. Una vez que te asignen
                una división, podrás ingresar normalmente.
              </p>
            </div>
          </main>
        </div>
      )
    }
  }

  // --- Normal layout ---
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-vrc-green text-white px-4 py-1.5 flex items-center justify-between shadow">
        <Link href="/players">
          <Image
            src="/isotipo.png"
            alt="Virreyes Rugby Club"
            width={200}
            height={133}
            className="brightness-0 invert"
            style={{ height: '34px', width: 'auto' }}
            priority
          />
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-green-100 hidden sm:block">{profile?.full_name}</span>
          <form action={logout}>
            <button type="submit" className="text-xs text-green-200 hover:text-white">
              Salir
            </button>
          </form>
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1 overflow-auto pb-20">
        {children}
      </main>

      <BottomNav isAdmin={profile?.role === 'admin'} isTutora={profile?.role === 'tutora'} />
    </div>
  )
}
