import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Handles Supabase Auth callbacks for:
 * - Email magic links (password reset)
 * - OAuth (Google, etc.)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type') // 'recovery' for password reset

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Password reset → go to reset form
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/reset-password`)
      }
      // OAuth → go to app
      return NextResponse.redirect(`${origin}/attendance`)
    }
  }

  // Something went wrong
  return NextResponse.redirect(`${origin}/login?error=auth_callback`)
}
