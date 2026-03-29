'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createBus(formData: FormData) {
  const label = (formData.get('label') as string)?.trim()
  const patente = (formData.get('patente') as string)?.trim() || null
  const driver_name = (formData.get('driver_name') as string)?.trim() || null
  const driver_phone = (formData.get('driver_phone') as string)?.trim() || null

  if (!label) return { error: 'Falta el nombre' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('buses')
    .insert({ label, patente, driver_name, driver_phone })
    .select('id, label, patente, driver_name, driver_phone, active')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/admin/buses')
  return { bus: data }
}

export async function updateBus(formData: FormData) {
  const id = formData.get('id') as string
  const label = (formData.get('label') as string)?.trim()
  const patente = (formData.get('patente') as string)?.trim() || null
  const driver_name = (formData.get('driver_name') as string)?.trim() || null
  const driver_phone = (formData.get('driver_phone') as string)?.trim() || null

  if (!id || !label) return { error: 'Faltan datos' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('buses')
    .update({ label, patente, driver_name, driver_phone })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin/buses')
  return { success: true }
}

export async function toggleBusActive(id: string, active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('buses')
    .update({ active })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin/buses')
  return { success: true }
}
