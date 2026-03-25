import { createClient } from '@/lib/supabase/server'

export type WikiPage = {
  id: string
  title: string
  slug: string
  content: string | null
  category: string
  sort_order: number
  published: boolean
  updated_at: string
}

export async function getWikiPages(): Promise<WikiPage[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('wiki_pages')
    .select('id, title, slug, content, category, sort_order, published, updated_at')
    .order('sort_order')
    .order('created_at')
  return (data ?? []) as WikiPage[]
}

export async function getWikiPage(slug: string): Promise<WikiPage | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('wiki_pages')
    .select('id, title, slug, content, category, sort_order, published, updated_at')
    .eq('slug', slug)
    .single()
  return data as WikiPage | null
}
