import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Handles Supabase Auth callbacks for:
 * - Email magic links (password reset)
 * - OAuth (Google, etc.)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code       = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type') // 'recovery' para reset de password

  const supabase = await createClient()

  // Formato nuevo de Supabase: token_hash en el email de reset
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'recovery' | 'email' | 'signup' | 'magiclink',
    })
    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/reset-password`)
      }
      return NextResponse.redirect(`${origin}/attendance`)
    }
  }

  // Formato OAuth / PKCE: code exchange
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/reset-password`)
      }
      return NextResponse.redirect(`${origin}/attendance`)
    }
  }

  // Algo falló
  return NextResponse.redirect(`${origin}/login?error=auth_callback`)
}
