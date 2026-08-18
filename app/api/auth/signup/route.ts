import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { generateShortId, hashPassword, createSessionToken, COOKIE_NAME } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { username, display_name, password, avatar_url, bio } = await req.json()

    if (!username || !display_name || !password) {
      return NextResponse.json({ error: 'Username, display name, and password are required' }, { status: 400 })
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (cleanUsername.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 alphanumeric characters' }, { status: 400 })
    }

    if (password.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database is not configured' }, { status: 500 })
    }

    // Check if username already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', cleanUsername)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 409 })
    }

    // Generate unique short_id
    let shortId = generateShortId()
    let isUnique = false
    let attempts = 0

    while (!isUnique && attempts < 5) {
      const { data: existingId } = await supabase
        .from('profiles')
        .select('id')
        .eq('short_id', shortId)
        .maybeSingle()

      if (!existingId) {
        isUnique = true
      } else {
        shortId = generateShortId()
        attempts++
      }
    }

    const passwordHash = await hashPassword(password)
    const isAdmin = cleanUsername === 'dars' || cleanUsername === 'darskie' || cleanUsername === 'admin'
    const finalAvatar = avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanUsername}`

    const { data: profile, error } = await supabase
      .from('profiles')
      .insert({
        short_id: shortId,
        username: cleanUsername,
        display_name: display_name.trim(),
        avatar_url: finalAvatar,
        bio: bio?.trim() || '',
        password_hash: passwordHash,
        is_online: true,
        is_admin: isAdmin,
        is_banned: false,
        last_active_at: new Date().toISOString()
      })
      .select('id, short_id, username, display_name, avatar_url, bio, is_online, is_admin, is_banned, created_at')
      .single()

    if (error || !profile) {
      console.error('Signup insert error:', error)
      return NextResponse.json({ error: error?.message || 'Failed to create account' }, { status: 500 })
    }

    const token = await createSessionToken({
      userId: profile.id,
      username: profile.username,
      shortId: profile.short_id,
      isAdmin: Boolean(profile.is_admin)
    })

    const res = NextResponse.json({ success: true, user: profile })
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
    console.error('Signup error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
