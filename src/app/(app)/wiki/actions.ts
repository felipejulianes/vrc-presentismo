'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/auth/guards'

export async function saveWikiPage(formData: FormData) {
  await assertAdmin()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const id = formData.get('id') as string | null
  const title = (formData.get('title') as string).trim()
  const slug = title.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
  const content = formData.get('content') as string
  const category = (formData.get('category') as string) || 'general'

  if (!title) return { error: 'El título es requerido' }

  if (id) {
    const { error } = await supabase
      .from('wiki_pages')
      .update({ title, content, category, updated_at: new Date().toISOString(), updated_by: user?.id })
      .eq('id', id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('wiki_pages')
      .insert({ title, slug, content, category, created_by: user?.id, updated_by: user?.id })
    if (error) return { error: error.message }
  }

  revalidatePath('/wiki')
  return { error: null }
}

export async function deleteWikiPage(id: string) {
  await assertAdmin()
  const supabase = await createClient()
  const { error } = await supabase.from('wiki_pages').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/wiki')
  return { error: null }
}
