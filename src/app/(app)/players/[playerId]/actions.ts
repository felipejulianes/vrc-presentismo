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

export async function addInterview(playerId: string, formData: FormData) {
  const notas = (formData.get('notas') as string)?.trim()
  const interview_date = formData.get('interview_date') as string
  const grado = (formData.get('grado') as string)?.trim() || null
  // Colegio: new_school_name if school changed, else current_colegio (auto-snapshot)
  const new_school_id = (formData.get('new_school_id') as string)?.trim() || null
  const new_school_name = (formData.get('new_school_name') as string)?.trim() || null
  const current_colegio = (formData.get('current_colegio') as string)?.trim() || null
  const colegio_snapshot = new_school_name || current_colegio || null

  if (!notas) return { error: 'Escribí las notas de la entrevista' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Si cambió de colegio, actualizar el jugador
  if (new_school_id && new_school_name) {
    await supabase.from('players').update({
      school_id: new_school_id,
      colegio: new_school_name,
    }).eq('id', playerId)
  }

  const { error } = await supabase.from('player_interviews').insert({
    player_id: playerId,
    notas,
    interview_date: interview_date || new Date().toISOString().split('T')[0],
    grado,
    colegio_snapshot,
    interviewer_id: user.id,
  })

  if (error) return { error: error.message }
  revalidatePath(`/players/${playerId}`)
  return { success: true }
}

export async function deleteInterview(playerId: string, interviewId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('player_interviews').delete().eq('id', interviewId)
  if (error) return { error: error.message }
  revalidatePath(`/players/${playerId}`)
  return { success: true }
}
