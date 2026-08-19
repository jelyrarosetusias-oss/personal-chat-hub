import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUser()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ success: false })
    }

    // 1. Fetch unread messages in this conversation where current user is NOT sender
    const { data: unreadMsgs, error: fetchErr } = await supabase
      .from('messages')
      .select('id, seen_by')
      .eq('conversation_id', id)
      .neq('sender_id', session.userId)

    if (fetchErr || !unreadMsgs || unreadMsgs.length === 0) {
      return NextResponse.json({ success: true, count: 0 })
    }

    // Filter messages where user is not yet in seen_by array
    const toUpdate = unreadMsgs.filter((m) => !(m.seen_by || []).includes(session.userId))

    if (toUpdate.length === 0) {
      return NextResponse.json({ success: true, count: 0 })
    }

    // Update each message with user in seen_by
    await Promise.all(
      toUpdate.map((m) =>
        supabase
          .from('messages')
          .update({ seen_by: Array.from(new Set([...(m.seen_by || []), session.userId])) })
          .eq('id', m.id)
      )
    )

    return NextResponse.json({ success: true, count: toUpdate.length })
  } catch (err: any) {
    console.error('Mark seen error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
