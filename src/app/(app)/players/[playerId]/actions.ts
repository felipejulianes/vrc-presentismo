'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addFollowup(playerId: string, formData: FormData) {
  const contact_type = formData.get('contact_type') as string
  const notes = (formData.get('notes') as string)?.trim()
  const contact_date = formData.get('contact_date') as string

  if (!contact_type || !notes) return { error: 'Completá todos los campos' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.from('player_followups').insert({
    player_id: playerId,
    contact_type,
    notes,
    contact_date: contact_date || new Date().toISOString().split('T')[0],
    created_by: user.id,
  })

  if (error) return { error: error.message }
  revalidatePath(`/players/${playerId}`)
  return { success: true }
}

export async function deleteFollowup(playerId: string, followupId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('player_followups').delete().eq('id', followupId)
  if (error) return { error: error.message }
  revalidatePath(`/players/${playerId}`)
  return { success: true }
}

export async function addNote(playerId: string, formData: FormData) {
  const content = (formData.get('content') as string)?.trim()
  const note_date = formData.get('note_date') as string

  if (!content) return { error: 'Escribí una nota' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { error } = await supabase.from('player_notes').insert({
    player_id: playerId,
    content,
    note_date: note_date || new Date().toISOString().split('T')[0],
    created_by: user.id,
  })

  if (error) return { error: error.message }
  revalidatePath(`/players/${playerId}`)
  return { success: true }
}

export async function deleteNote(playerId: string, noteId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('player_notes').delete().eq('id', noteId)
  if (error) return { error: error.message }
  revalidatePath(`/players/${playerId}`)
  return { success: true }
}
