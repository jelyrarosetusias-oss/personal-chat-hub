import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSessionUser()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ conversations: [] })
    }

    // 1. Get all conversation IDs where current user is a member
    const { data: memberships, error: mErr } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', session.userId)

    if (mErr || !memberships || memberships.length === 0) {
      return NextResponse.json({ conversations: [] })
    }

    const convIds = memberships.map((m) => m.conversation_id)

    // 2. Parallel fetch: Fetch conversations with members AND latest messages in parallel
    const [convsRes, msgsRes] = await Promise.all([
      supabase
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
        .in('id', convIds)
        .order('created_at', { ascending: false }),

      supabase
        .from('messages')
        .select('id, conversation_id, content, sender_id, media_url, media_type, created_at, unsent')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false })
        .limit(100)
    ])

    if (convsRes.error) {
      return NextResponse.json({ error: convsRes.error.message }, { status: 500 })
    }

    // Build latest message map for fast O(1) lookup
    const latestMsgMap: Record<string, any> = {}
    if (msgsRes.data) {
      for (const msg of msgsRes.data) {
        if (!latestMsgMap[msg.conversation_id]) {
          latestMsgMap[msg.conversation_id] = msg
        }
      }
    }

    const formattedConvs = (convsRes.data || []).map((c: any) => {
      const membersList = (c.members || []).map((m: any) => m.user).filter(Boolean)
      return {
        id: c.id,
        type: c.type,
        name: c.name,
        avatar_url: c.avatar_url,
        created_by: c.created_by,
        created_at: c.created_at,
        members: membersList,
        last_message: latestMsgMap[c.id] || null
      }
    })

    // Sort by latest message or creation time
    formattedConvs.sort((a, b) => {
      const timeA = new Date(a.last_message?.created_at || a.created_at).getTime()
      const timeB = new Date(b.last_message?.created_at || b.created_at).getTime()
      return timeB - timeA
    })

    return NextResponse.json({ conversations: formattedConvs })
  } catch (err: any) {
    console.error('Conversations GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, avatar_url, member_ids } = await req.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    const groupAvatar = avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name.trim())}`

    // 1. Create group conversation
    const { data: newGroup, error: groupErr } = await supabase
      .from('conversations')
      .insert({
        type: 'group',
        name: name.trim(),
        avatar_url: groupAvatar,
        created_by: session.userId
      })
      .select('id, type, name, avatar_url, created_by, created_at')
      .single()

    if (groupErr || !newGroup) {
      return NextResponse.json({ error: groupErr?.message || 'Failed to create group' }, { status: 500 })
    }

    // 2. Add creator as admin + other members
    const allMemberIds = Array.from(new Set([session.userId, ...(member_ids || [])]))
    const membershipRows = allMemberIds.map((uid) => ({
      conversation_id: newGroup.id,
      user_id: uid,
      role: uid === session.userId ? 'admin' : 'member'
    }))

    await supabase.from('conversation_members').insert(membershipRows)

    return NextResponse.json({ success: true, conversation: newGroup })
  } catch (err: any) {
    console.error('Group create error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
