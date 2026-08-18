import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getSessionUser, COOKIE_NAME } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSessionUser()
    if (!session?.userId) {
      return NextResponse.json({ user: null })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ user: null })
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, short_id, username, display_name, avatar_url, bio, is_online, is_admin, is_banned, created_at')
      .eq('id', session.userId)
      .maybeSingle()

    if (error || !profile) {
      const res = NextResponse.json({ user: null })
      res.cookies.delete(COOKIE_NAME)
      return res
    }

    if (profile.is_banned) {
      const res = NextResponse.json({ user: null, banned: true, error: 'Your account is banned' })
      res.cookies.delete(COOKIE_NAME)
      return res
    }

    // Ping active timestamp
    await supabase
      .from('profiles')
      .update({ is_online: true, last_active_at: new Date().toISOString() })
      .eq('id', profile.id)

    return NextResponse.json({ user: profile })
  } catch (err: any) {
    console.error('Session check error:', err)
    return NextResponse.json({ user: null, error: err.message }, { status: 500 })
  }
}
