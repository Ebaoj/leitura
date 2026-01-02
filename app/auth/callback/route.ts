import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const isNew = searchParams.get('new') === 'true'
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Check if profile exists
      const { data: profile } = await supabase
        .from('leitura_profiles')
        .select('id')
        .eq('id', data.user.id)
        .single()

      // If no profile and it's a new user, redirect to setup
      if (!profile && isNew) {
        return NextResponse.redirect(`${origin}/setup`)
      }

      // If no profile exists, create one
      if (!profile) {
        const username = data.user.email?.split('@')[0] || `user_${Date.now()}`
        await supabase
          .from('leitura_profiles')
          .insert({
            id: data.user.id,
            username,
            display_name: username,
          })
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth`)
}
