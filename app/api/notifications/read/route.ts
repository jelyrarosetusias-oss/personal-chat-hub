import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    const { notification_id, mark_all } = await req.json().catch(() => ({}))

    if (mark_all) {
      // Mark all unread as read
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('recipient_id', session.userId)
        .eq('is_read', false)
    } else if (notification_id) {
      // Mark single notification as read
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification_id)
        .eq('recipient_id', session.userId)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Mark notification read error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
