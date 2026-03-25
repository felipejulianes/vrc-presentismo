import { createClient } from '@/lib/supabase/server'
import { getWikiPages } from '@/lib/queries/wiki'
import { WikiPageList } from '@/components/wiki/WikiPageList'

export default async function WikiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const pages = await getWikiPages()
  const isAdmin = profile?.role === 'admin'

  return (
    <div className="pb-24">
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reglamento</h1>
          <p className="text-sm text-gray-500">Rugby infantil · recursos para entrenadores</p>
        </div>
      </div>
      <WikiPageList pages={pages} isAdmin={isAdmin} />
    </div>
  )
}
