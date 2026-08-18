import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSessionUser()
    if (!session?.userId || !session.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ users: [] })
    }

    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, short_id, username, display_name, avatar_url, bio, is_online, last_active_at, is_banned, is_admin, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ users: users || [] })
  } catch (err: any) {
    console.error('Admin users error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionUser()
    if (!session?.userId || !session.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { user_id, is_banned } = await req.json()
    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (user_id === session.userId) {
      return NextResponse.json({ error: 'Admin cannot ban themselves' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    const { data: updated, error } = await supabase
      .from('profiles')
      .update({ is_banned: Boolean(is_banned) })
      .eq('id', user_id)
      .select('id, short_id, username, display_name, is_banned')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, user: updated })
  } catch (err: any) {
    console.error('Admin ban error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
