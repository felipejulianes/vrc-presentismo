'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/auth/guards'

export async function createSchool(name: string): Promise<{ id: string; name: string } | null> {
  await assertAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('schools')
    .insert({ name: name.trim() })
    .select('id, name')
    .single()
  if (error) return null
  revalidatePath('/admin/schools')
  revalidatePath('/tutoras/schools')
  return data
}

export async function updateSchool(formData: FormData) {
  await assertAdmin()
  const id = formData.get('id') as string
  const name = (formData.get('name') as string)?.trim()
  const aliases = (formData.get('aliases') as string)?.trim() || null
  const active = formData.get('active') !== 'false'
  const address = (formData.get('address') as string)?.trim() || null
  const latRaw = formData.get('lat')
  const lngRaw = formData.get('lng')
  const maps_url = (formData.get('maps_url') as string)?.trim() || null

  if (!id || !name) return { error: 'Faltan datos' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('schools')
    .update({
      name, aliases, active,
      address,
      lat: latRaw ? parseFloat(latRaw as string) : null,
      lng: lngRaw ? parseFloat(lngRaw as string) : null,
      maps_url,
    })
    .eq('id', id)

  revalidatePath('/admin/schools')
  revalidatePath('/tutoras/schools')
  return error ? { error: error.message } : { success: true }
}

export async function mergeSchools(formData: FormData) {
  await assertAdmin()
  // Reasigna todos los jugadores de sourceId a targetId y desactiva source
  const sourceId = formData.get('source_id') as string
  const targetId = formData.get('target_id') as string
  if (!sourceId || !targetId || sourceId === targetId) return { error: 'IDs inválidos' }

  const supabase = await createClient()
  await supabase.from('players').update({ school_id: targetId }).eq('school_id', sourceId)
  await supabase.from('schools').update({ active: false }).eq('id', sourceId)

  revalidatePath('/admin/schools')
  revalidatePath('/tutoras/schools')
  return { success: true }
}
