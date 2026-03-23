'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ── Clubes rivales ──────────────────────────────────────────

export async function addOpponentClub(name: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('opponent_clubs')
    .insert({ name: name.trim() })
    .select('id, name, active')
    .single()
  if (error) return { error: error.message }
  revalidatePath('/admin/sabados')
  revalidatePath('/admin/clubs')
  return { club: data }
}

export async function renameClub(id: string, name: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('opponent_clubs')
    .update({ name: name.trim() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/clubs')
  revalidatePath('/admin/sabados')
  return { success: true }
}

export async function toggleClubActive(id: string, active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('opponent_clubs')
    .update({ active })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/clubs')
  revalidatePath('/admin/sabados')
  return { success: true }
}

// ── Bondis ───────────────────────────────────────────────────

export async function saveBus(formData: FormData) {
  const id = formData.get('id') as string | null
  const event_date = formData.get('event_date') as string
  const label = (formData.get('label') as string)?.trim()
  const driver_phone = (formData.get('driver_phone') as string)?.trim() || null

  if (!label || !event_date) return { error: 'Faltan datos' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (id) {
    const { error } = await supabase
      .from('event_buses')
      .update({ label, driver_phone })
      .eq('id', id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('event_buses')
      .insert({ event_date, label, driver_phone, created_by: user?.id })
    if (error) return { error: error.message }
  }

  revalidatePath(`/admin/sabados/${event_date}`)
  return { success: true }
}

export async function deleteBus(busId: string, date: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('event_buses').delete().eq('id', busId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/sabados/${date}`)
  return { success: true }
}

// ── Actividades por división ─────────────────────────────────

export async function saveDivisionActivity(formData: FormData) {
  const event_date = formData.get('event_date') as string
  const division_id = formData.get('division_id') as string
  const activity_type = formData.get('activity_type') as string
  const venue = (formData.get('venue') as string) || null
  // Support multiple opponent clubs — getAll returns all values with the same key
  const opponent_club_ids = formData.getAll('opponent_club_id').filter(Boolean) as string[]
  const opponent_club_id = opponent_club_ids[0] ?? null  // first club kept for backwards compat
  const location_club_id = (formData.get('location_club_id') as string) || null
  const location_notes = (formData.get('location_notes') as string)?.trim() || null
  const bus_id = (formData.get('bus_id') as string) || null

  if (!event_date || !division_id || !activity_type) return { error: 'Faltan datos' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const payload = {
    activity_date: event_date,
    division_id,
    activity_type,
    venue: activity_type === 'partido' ? venue : null,
    opponent_club_id: activity_type === 'partido' ? opponent_club_id : null,
    opponent_club_ids: activity_type === 'partido' ? opponent_club_ids : [],
    location_club_id: activity_type === 'partido' && venue === 'visitante' ? location_club_id : null,
    location_notes,
    bus_id,
    created_by: user?.id,
  }

  const { error } = await supabase
    .from('division_activities')
    .upsert(payload, { onConflict: 'activity_date,division_id' })

  if (error) return { error: error.message }

  // Auto-create the training session so coaches see it in their list
  await supabase
    .from('training_sessions')
    .upsert(
      { division_id, session_date: event_date, created_by: user?.id },
      { onConflict: 'division_id,session_date', ignoreDuplicates: true }
    )

  revalidatePath(`/admin/sabados/${event_date}`)
  revalidatePath(`/attendance/${division_id}`)
  return { success: true }
}

export async function deleteDivisionActivity(divisionId: string, date: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('division_activities')
    .delete()
    .eq('division_id', divisionId)
    .eq('activity_date', date)
  if (error) return { error: error.message }
  revalidatePath(`/admin/sabados/${date}`)
  return { success: true }
}

// ── Tercer tiempo ────────────────────────────────────────────

export async function saveTercerTiempo(formData: FormData) {
  const activity_date = formData.get('activity_date') as string
  const division_id = formData.get('division_id') as string
  const local_kids_count = formData.get('local_kids_count')
  const local_coaches_count = formData.get('local_coaches_count')
  const notes = (formData.get('notes') as string)?.trim() || null

  if (!activity_date || !division_id) return { error: 'Faltan datos' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const toInt = (v: FormDataEntryValue | null) => {
    const n = parseInt(v as string)
    return isNaN(n) ? null : n
  }

  const { error } = await supabase
    .from('tercer_tiempo_reports')
    .upsert({
      activity_date,
      division_id,
      local_kids_count: toInt(local_kids_count),
      local_coaches_count: toInt(local_coaches_count),
      notes,
      reported_by: user?.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'activity_date,division_id' })

  if (error) return { error: error.message }
  revalidatePath(`/admin/sabados/${activity_date}`)
  revalidatePath('/attendance')
  return { success: true }
}

// visitors is a JSON string: [{club_id, kids_count, coaches_count}]
export async function saveTercerTiempoVisitors(
  activity_date: string,
  division_id: string,
  visitors: { club_id: string; kids_count: number | null; coaches_count: number | null }[]
) {
  if (!activity_date || !division_id) return { error: 'Faltan datos' }

  const supabase = await createClient()

  // Delete existing visitors for this division/date, then re-insert
  const { error: delErr } = await supabase
    .from('tercer_tiempo_visitors')
    .delete()
    .eq('activity_date', activity_date)
    .eq('division_id', division_id)

  if (delErr) return { error: delErr.message }

  const rows = visitors
    .filter(v => v.club_id)
    .map(v => ({ activity_date, division_id, club_id: v.club_id, kids_count: v.kids_count, coaches_count: v.coaches_count }))

  if (rows.length > 0) {
    const { error: insErr } = await supabase.from('tercer_tiempo_visitors').insert(rows)
    if (insErr) return { error: insErr.message }
  }

  revalidatePath(`/admin/sabados/${activity_date}`)
  revalidatePath('/attendance')
  return { success: true }
}
