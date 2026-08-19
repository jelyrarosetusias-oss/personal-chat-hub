import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth'

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionUser()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { display_name, avatar_url, cover_url, bio } = await req.json()
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    const updatePayload: Record<string, any> = {
      last_active_at: new Date().toISOString()
    }
    if (display_name?.trim()) updatePayload.display_name = display_name.trim()
    if (avatar_url) updatePayload.avatar_url = avatar_url
    if (cover_url !== undefined) updatePayload.cover_url = cover_url
    if (bio !== undefined) updatePayload.bio = bio.trim()

    const { data: updated, error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', session.userId)
      .select('id, short_id, username, display_name, avatar_url, cover_url, bio, is_online, is_admin, is_banned, created_at')
      .single()

    if (error || !updated) {
      return NextResponse.json({ error: error?.message || 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ success: true, user: updated })
  } catch (err: any) {
    console.error('Update profile error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
