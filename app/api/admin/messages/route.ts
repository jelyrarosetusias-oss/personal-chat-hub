import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser()
    if (!session?.userId || !session.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ messages: [] })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        sender_id,
        content,
        media_url,
        media_type,
        reactions,
        unsent,
        created_at,
        sender:profiles!messages_sender_id_fkey(id, short_id, username, display_name, avatar_url),
        conversation:conversations!messages_conversation_id_fkey(id, type, name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ messages: messages || [] })
  } catch (err: any) {
    console.error('Admin messages error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionUser()
    if (!session?.userId || !session.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { message_id } = await req.json()
    if (!message_id) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', message_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Admin delete message error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
