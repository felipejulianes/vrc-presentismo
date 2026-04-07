'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') throw new Error('Sin permisos')
}

export async function assertTutoraOrAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!['admin', 'tutora'].includes(profile?.role)) throw new Error('Sin permisos')
  return { user, role: profile?.role as 'admin' | 'tutora' }
}

export async function createCoach(formData: FormData) {
  await assertAdmin()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const full_name = formData.get('full_name') as string
  const role = (formData.get('role') as string) || 'coach'

  if (!email || !password || !full_name) {
    return { error: 'Todos los campos son obligatorios' }
  }
  if (password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres' }
  }

  const admin = createAdminClient()

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'Ya existe un usuario con ese email' }
    }
    return { error: error.message }
  }

  // Asegurarse que el perfil exista (por si el trigger falló)
  if (data.user) {
    await admin.from('profiles').upsert({
      id: data.user.id,
      role,
      full_name,
    }, { onConflict: 'id' })
  }

  revalidatePath('/admin/coaches')
  return { success: true, userId: data.user?.id }
}

export async function createTutora(formData: FormData) {
  await assertAdmin()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const full_name = formData.get('full_name') as string

  if (!email || !password || !full_name) {
    return { error: 'Todos los campos son obligatorios' }
  }
  if (password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres' }
  }

  const admin = createAdminClient()

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role: 'tutora' },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'Ya existe un usuario con ese email' }
    }
    return { error: error.message }
  }

  if (data.user) {
    await admin.from('profiles').upsert({
      id: data.user.id,
      role: 'tutora',
      full_name,
    }, { onConflict: 'id' })
  }

  revalidatePath('/admin/coaches')
  return { success: true, userId: data.user?.id }
}

export async function updateCoachDivisions(coachId: string, divisionIds: string[]) {
  await assertAdmin()

  const admin = createAdminClient()

  // Borrar asignaciones actuales
  await admin.from('coach_divisions').delete().eq('coach_id', coachId)

  // Insertar las nuevas
  if (divisionIds.length > 0) {
    const rows = divisionIds.map(div_id => ({ coach_id: coachId, division_id: div_id }))
    const { error } = await admin.from('coach_divisions').insert(rows)
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/coaches')
  revalidatePath(`/admin/coaches/${coachId}`)
  return { success: true }
}

export async function updateUserRole(coachId: string, role: 'admin' | 'coach' | 'tutora') {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ role })
    .eq('id', coachId)
  if (error) return { error: error.message }
  revalidatePath('/admin/coaches')
  revalidatePath(`/admin/coaches/${coachId}`)
  return { success: true }
}

export async function deleteCoach(coachId: string) {
  await assertAdmin()
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(coachId)
  if (error) return { error: error.message }
  revalidatePath('/admin/coaches')
  return { success: true }
}

export async function executeProgression() {
  await assertAdmin()
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('execute_annual_progression')
  if (error) return { error: error.message }
  revalidatePath('/admin')
  revalidatePath('/players')
  return { success: true, result: data }
}
