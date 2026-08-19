import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser()
    if (!session?.userId || !session.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { is_online, active_status_hidden } = await req.json()
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    const updatePayload: Record<string, any> = {
      is_online: Boolean(is_online)
    }

    if (active_status_hidden !== undefined) {
      updatePayload.active_status_hidden = Boolean(active_status_hidden)
    }

    if (!is_online) {
      updatePayload.last_active_at = new Date().toISOString()
    }

    const { data: updated, error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', session.userId)
      .select('id, short_id, username, display_name, avatar_url, bio, is_online, is_admin, is_banned, last_active_at, active_status_hidden')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, user: updated })
  } catch (err: any) {
    console.error('Active status toggle error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
