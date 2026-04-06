'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { assertTutoraOrAdmin } from '@/app/(app)/admin/actions'

export async function createSchoolVisit(formData: FormData) {
  const { user } = await assertTutoraOrAdmin()

  const school_id = formData.get('school_id') as string
  const visit_date = formData.get('visit_date') as string
  const notas = (formData.get('notas') as string)?.trim() || null
  const divisionIdsRaw = formData.get('division_ids') as string
  const division_ids = divisionIdsRaw ? divisionIdsRaw.split(',').filter(Boolean) : []

  if (!school_id || !visit_date) return { error: 'Colegio y fecha son obligatorios' }

  const supabase = await createClient()
  const { error } = await supabase.from('school_visits').insert({
    school_id,
    visit_date,
    notas,
    division_ids,
    created_by: user.id,
    status: 'planificada',
  })

  if (error) return { error: error.message }
  revalidatePath('/tutoras/schools')
  revalidatePath(`/tutoras/schools/${school_id}`)
  return { success: true }
}

export async function updateVisitStatus(visitId: string, status: 'planificada' | 'realizada' | 'cancelada', schoolId: string) {
  await assertTutoraOrAdmin()

  const supabase = await createClient()
  const { error } = await supabase
    .from('school_visits')
    .update({ status })
    .eq('id', visitId)

  if (error) return { error: error.message }
  revalidatePath('/tutoras/schools')
  revalidatePath(`/tutoras/schools/${schoolId}`)
  return { success: true }
}

export async function deleteSchoolVisit(visitId: string, schoolId: string) {
  await assertTutoraOrAdmin()

  const supabase = await createClient()
  const { error } = await supabase.from('school_visits').delete().eq('id', visitId)
  if (error) return { error: error.message }
  revalidatePath('/tutoras/schools')
  revalidatePath(`/tutoras/schools/${schoolId}`)
  return { success: true }
}

export async function toggleDoc(playerId: string, docType: string, currentlyReceived: boolean) {
  await assertTutoraOrAdmin()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (currentlyReceived) {
    const { error } = await supabase
      .from('player_documents')
      .delete()
      .eq('player_id', playerId)
      .eq('doc_type', docType)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('player_documents')
      .upsert({ player_id: playerId, doc_type: docType, received_by: user!.id }, { onConflict: 'player_id,doc_type' })
    if (error) return { error: error.message }
  }

  revalidatePath('/tutoras/docs')
  revalidatePath('/docs')
  return { success: true }
}

export async function updatePlayerGradoColegio(
  playerId: string,
  grado: string | null,
  schoolId: string | null,
  colegio: string | null,
) {
  await assertTutoraOrAdmin()

  const supabase = await createClient()
  const { error } = await supabase
    .from('players')
    .update({ grado, school_id: schoolId, colegio })
    .eq('id', playerId)

  if (error) return { error: error.message }
  revalidatePath('/tutoras/players')
  revalidatePath(`/players/${playerId}`)
  return { success: true }
}

export async function createInterviewFromTutoras(formData: FormData) {
  const { user } = await assertTutoraOrAdmin()

  const player_id = formData.get('player_id') as string
  const interview_date = formData.get('interview_date') as string
  const grado = (formData.get('grado') as string)?.trim() || null
  const colegio_snapshot = (formData.get('colegio_snapshot') as string)?.trim() || null
  const notas = (formData.get('notas') as string)?.trim() || ''

  if (!player_id || !notas) return { error: 'Jugador y notas son obligatorios' }

  const supabase = await createClient()
  const { error } = await supabase.from('player_interviews').insert({
    player_id,
    interview_date: interview_date || new Date().toISOString().split('T')[0],
    interviewer_id: user.id,
    grado,
    colegio_snapshot,
    notas,
  })

  if (error) return { error: error.message }
  revalidatePath('/tutoras/interviews')
  revalidatePath(`/players/${player_id}`)
  return { success: true }
}

export async function deleteInterviewFromTutoras(interviewId: string, playerId: string) {
  await assertTutoraOrAdmin()

  const supabase = await createClient()
  const { error } = await supabase.from('player_interviews').delete().eq('id', interviewId)
  if (error) return { error: error.message }
  revalidatePath('/tutoras/interviews')
  revalidatePath(`/players/${playerId}`)
  return { success: true }
}
