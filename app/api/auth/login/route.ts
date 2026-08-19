import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { comparePassword, createSessionToken, COOKIE_NAME } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { identifier, password } = await req.json()

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Username or Short ID and password are required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database is not configured' }, { status: 500 })
    }

    const cleanIdentifier = identifier.trim().toLowerCase()
    const cleanShortId = identifier.trim().toUpperCase()

    // Find by username OR short_id
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.eq.${cleanIdentifier},short_id.eq.${cleanShortId}`)
      .maybeSingle()

    if (error || !profile) {
      return NextResponse.json({ error: 'Invalid credentials. User not found.' }, { status: 401 })
    }

    if (profile.is_banned) {
      return NextResponse.json({ error: 'This account has been banned by an administrator.' }, { status: 403 })
    }

    const isMatch = await comparePassword(password, profile.password_hash)
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid username/ID or password.' }, { status: 401 })
    }

    // For regular users: always set online. For admins: preserve their offline/invisible choice if disabled.
    const isOnline = profile.is_admin ? Boolean(profile.is_online) : true

    await supabase
      .from('profiles')
      .update({ is_online: isOnline, last_active_at: new Date().toISOString() })
      .eq('id', profile.id)

    const token = await createSessionToken({
      userId: profile.id,
      username: profile.username,
      shortId: profile.short_id,
      isAdmin: Boolean(profile.is_admin)
    })

    const safeProfile = {
      id: profile.id,
      short_id: profile.short_id,
      username: profile.username,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      bio: profile.bio,
      is_online: isOnline,
      is_admin: profile.is_admin,
      is_banned: profile.is_banned,
      created_at: profile.created_at
    }

    const res = NextResponse.json({ success: true, user: safeProfile })
    res.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/'
    })

    return res
  } catch (err: any) {
    console.error('Login error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
