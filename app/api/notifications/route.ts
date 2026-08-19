import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser()
    if (!session?.userId) {
      return NextResponse.json({ notifications: [], unread_count: 0 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ notifications: [], unread_count: 0 })
    }

    // 1. Fetch recent notifications
    const { data: notifs, error } = await supabase
      .from('notifications')
      .select('id, recipient_id, actor_id, type, post_id, comment_id, message_id, content_preview, is_read, created_at')
      .eq('recipient_id', session.userId)
      .order('created_at', { ascending: false })
      .limit(40)

    if (error) {
      console.error('Fetch notifications error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const notifList = notifs || []
    const actorIds = Array.from(new Set(notifList.map((n) => n.actor_id).filter(Boolean)))

    // 2. Fetch actor profiles in batch
    let profileMap: Record<string, any> = {}
    if (actorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, short_id, username, display_name, avatar_url, is_admin')
        .in('id', actorIds)

      if (profiles) {
        for (const p of profiles) {
          profileMap[p.id] = p
        }
      }
    }

    const formattedNotifications = notifList.map((n: any) => ({
      ...n,
      actor: profileMap[n.actor_id] || {
        id: n.actor_id,
        display_name: 'Someone',
        username: 'user',
        short_id: '000000',
        avatar_url: null,
        is_admin: false
      }
    }))

    const unreadCount = notifList.filter((n) => !n.is_read).length

    return NextResponse.json({
      notifications: formattedNotifications,
      unread_count: unreadCount
    })
  } catch (err: any) {
    console.error('Notifications GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
