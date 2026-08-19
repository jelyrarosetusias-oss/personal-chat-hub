import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { is_online } = await req.json()
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    // Verify admin from session OR profiles table
    let isAdmin = Boolean(session.isAdmin)
    if (!isAdmin) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.userId)
        .single()
      isAdmin = Boolean(prof?.is_admin)
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const updatePayload: Record<string, any> = {
      is_online: Boolean(is_online)
    }

    if (!is_online) {
      updatePayload.last_active_at = new Date().toISOString()
    }

    const { data: updated, error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', session.userId)
      .select('id, short_id, username, display_name, avatar_url, bio, is_online, is_admin, is_banned, last_active_at, created_at')
      .single()

    if (error || !updated) {
      console.error('Active status DB error:', error)
      return NextResponse.json({ error: error?.message || 'Failed to update active status' }, { status: 500 })
    }

    return NextResponse.json({ success: true, user: updated })
  } catch (err: any) {
    console.error('Active status toggle error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
