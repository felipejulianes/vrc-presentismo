'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/attendance')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function sendPasswordReset(email: string) {
  const supabase = await createClient()
  const headersList = await headers()
  const origin = headersList.get('origin') ?? headersList.get('x-forwarded-host') ?? ''
  const protocol = origin.includes('localhost') ? 'http' : 'https'
  const baseUrl = origin.startsWith('http') ? origin : `${protocol}://${origin}`

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}/auth/callback?type=recovery`,
  })

  // No revelar si el email existe o no (seguridad)
  if (error && error.message !== 'Email not confirmed') {
    return { error: 'No se pudo enviar el email. Intentá de nuevo.' }
  }

  return { success: true }
}
