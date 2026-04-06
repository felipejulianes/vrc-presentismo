import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TutorasSidebar } from '@/components/tutoras/TutorasSidebar'

export default async function TutorasLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role as 'admin' | 'tutora' | undefined

  if (!['admin', 'tutora'].includes(role ?? '')) {
    redirect('/attendance')
  }

  return (
    <div className="flex min-h-[calc(100vh-52px)]">
      {/* Sidebar — solo desktop (≥768px) */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 flex-shrink-0">
        <TutorasSidebar role={role ?? 'tutora'} />
      </aside>

      {/* Contenido principal — pb-20 en mobile para el BottomNav del app layout */}
      <div className="flex-1 min-w-0 overflow-auto pb-20 md:pb-6">
        {children}
      </div>
    </div>
  )
}
