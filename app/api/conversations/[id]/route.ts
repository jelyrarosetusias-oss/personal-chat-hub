import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUser()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ messages: [], conversation: null })
    }

    // 1. Verify user is member of conversation (or is admin)
    const { data: membership } = await supabase
      .from('conversation_members')
      .select('role')
      .eq('conversation_id', id)
      .eq('user_id', session.userId)
      .maybeSingle()

    if (!membership && !session.isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // 2. Fetch conversation details & members
    const { data: conversation } = await supabase
      .from('conversations')
      .select(`
        id,
        type,
        name,
        avatar_url,
        created_by,
        created_at,
        members:conversation_members(
          role,
          user:profiles(id, short_id, username, display_name, avatar_url, bio, is_online, last_active_at)
        )
      `)
      .eq('id', id)
      .single()

    // 3. Fetch messages
    const { data: messages, error: msgErr } = await supabase
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
        seen_by,
        created_at,
        sender:profiles!messages_sender_id_fkey(id, short_id, username, display_name, avatar_url)
      `)
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    if (msgErr) {
      return NextResponse.json({ error: msgErr.message }, { status: 500 })
    }

    const formattedMessages = (messages || []).map((m: any) => ({
      id: m.id,
      conversation_id: m.conversation_id,
      sender_id: m.sender_id,
      sender_name: m.sender?.display_name || m.sender?.username || 'User',
      sender_avatar: m.sender?.avatar_url,
      content: m.content,
      media_url: m.media_url,
      media_type: m.media_type,
      reactions: m.reactions || {},
      unsent: m.unsent || false,
      seen_by: m.seen_by || [],
      created_at: m.created_at
    }))

    const membersList = (conversation?.members || []).map((m: any) => m.user).filter(Boolean)

    return NextResponse.json({
      conversation: conversation
        ? {
            id: conversation.id,
            type: conversation.type,
            name: conversation.name,
            avatar_url: conversation.avatar_url,
            created_by: conversation.created_by,
            created_at: conversation.created_at,
            members: membersList
          }
        : null,
      messages: formattedMessages
    })
  } catch (err: any) {
    console.error('Conversation detail GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUser()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { content, media_url, media_type } = await req.json()

    if (!content?.trim() && !media_url) {
      return NextResponse.json({ error: 'Message content or media is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    // Verify user is not banned
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('is_banned, display_name, avatar_url')
      .eq('id', session.userId)
      .single()

    if (userProfile?.is_banned) {
      return NextResponse.json({ error: 'You are banned and cannot send messages' }, { status: 403 })
    }

    // Verify user is member of conversation
    const { data: membership } = await supabase
      .from('conversation_members')
      .select('role')
      .eq('conversation_id', id)
      .eq('user_id', session.userId)
      .maybeSingle()

    if (!membership && !session.isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { data: newMsg, error: insertErr } = await supabase
      .from('messages')
      .insert({
        conversation_id: id,
        sender_id: session.userId,
        content: content?.trim() || '',
        media_url: media_url || null,
        media_type: media_type || (media_url ? 'image' : undefined),
        reactions: {},
        unsent: false,
        seen_by: [session.userId]
      })
      .select('id, conversation_id, sender_id, content, media_url, media_type, reactions, unsent, seen_by, created_at')
      .single()

    if (insertErr || !newMsg) {
      return NextResponse.json({ error: insertErr?.message || 'Failed to send message' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: {
        ...newMsg,
        sender_name: userProfile?.display_name || session.username,
        sender_avatar: userProfile?.avatar_url
      }
    })
  } catch (err: any) {
    console.error('Send message error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
