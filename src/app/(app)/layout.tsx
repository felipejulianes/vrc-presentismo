import Link from 'next/link'
import Image from 'next/image'
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

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-vrc-green text-white px-4 py-1.5 flex items-center justify-between shadow">
        <Image
          src="/isotipo.png"
          alt="Virreyes Rugby Club"
          width={200}
          height={133}
          className="brightness-0 invert"
          style={{ height: '34px', width: 'auto' }}
          priority
        />
        <div className="flex items-center gap-3">
          <span className="text-sm text-green-100 hidden sm:block">{profile?.full_name}</span>
          {profile?.role === 'admin' && (
            <Link
              href="/admin"
              className="text-xs bg-black/20 hover:bg-black/30 px-2 py-1 rounded"
            >
              Admin
            </Link>
          )}
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

      <BottomNav />
    </div>
  )
}
