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
      return NextResponse.json({ incoming: [], outgoing: [] })
    }

    // Incoming requests
    const { data: incoming, error: inErr } = await supabase
      .from('message_requests')
      .select(`
        id,
        from_user_id,
        to_user_id,
        status,
        message,
        created_at,
        from_user:profiles!message_requests_from_user_id_fkey(id, short_id, username, display_name, avatar_url, bio, is_online, last_active_at)
      `)
      .eq('to_user_id', session.userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    // Outgoing requests
    const { data: outgoing, error: outErr } = await supabase
      .from('message_requests')
      .select(`
        id,
        from_user_id,
        to_user_id,
        status,
        message,
        created_at,
        to_user:profiles!message_requests_to_user_id_fkey(id, short_id, username, display_name, avatar_url, bio, is_online, last_active_at)
      `)
      .eq('from_user_id', session.userId)
      .order('created_at', { ascending: false })

    if (inErr || outErr) {
      console.error('Fetch requests error:', inErr || outErr)
    }

    return NextResponse.json({
      incoming: incoming || [],
      outgoing: outgoing || []
    })
  } catch (err: any) {
    console.error('Requests GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { target_user_id, target_short_id, message } = await req.json()
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    let toUserId = target_user_id

    // If short_id provided, look up user
    if (!toUserId && target_short_id) {
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('id, is_banned')
        .eq('short_id', target_short_id.trim().toUpperCase())
        .maybeSingle()

      if (!targetProfile) {
        return NextResponse.json({ error: 'User not found with this ID' }, { status: 404 })
      }
      if (targetProfile.is_banned) {
        return NextResponse.json({ error: 'Cannot send request to this user' }, { status: 403 })
      }
      toUserId = targetProfile.id
    }

    if (!toUserId) {
      return NextResponse.json({ error: 'Recipient is required' }, { status: 400 })
    }

    if (toUserId === session.userId) {
      return NextResponse.json({ error: 'You cannot send a message request to yourself' }, { status: 400 })
    }

    // Check if DM conversation already exists between these 2 users
    const { data: existingMemberships } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', session.userId)

    if (existingMemberships && existingMemberships.length > 0) {
      const myConvIds = existingMemberships.map((m) => m.conversation_id)
      const { data: sharedDM } = await supabase
        .from('conversation_members')
        .select('conversation_id, conversations!inner(id, type)')
        .in('conversation_id', myConvIds)
        .eq('user_id', toUserId)
        .eq('conversations.type', 'dm')
        .maybeSingle()

      if (sharedDM) {
        return NextResponse.json({
          already_connected: true,
          conversation_id: sharedDM.conversation_id,
          message: 'You already have an active conversation with this user'
        })
      }
    }

    // Check if an existing request is pending or was sent in reverse
    const { data: existingRequest } = await supabase
      .from('message_requests')
      .select('id, from_user_id, to_user_id, status')
      .or(`and(from_user_id.eq.${session.userId},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${session.userId})`)
      .maybeSingle()

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        if (existingRequest.from_user_id === session.userId) {
          return NextResponse.json({ error: 'You already have a pending message request to this user' }, { status: 409 })
        } else {
          // The other user already sent a request to this user! Auto-accept it!
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({ type: 'dm', created_by: session.userId })
            .select('id')
            .single()

          if (newConv) {
            await supabase.from('conversation_members').insert([
              { conversation_id: newConv.id, user_id: session.userId, role: 'member' },
              { conversation_id: newConv.id, user_id: toUserId, role: 'member' }
            ])
            await supabase
              .from('message_requests')
              .update({ status: 'accepted' })
              .eq('id', existingRequest.id)

            return NextResponse.json({
              success: true,
              auto_accepted: true,
              conversation_id: newConv.id,
              message: 'Mutual connection! Conversation started.'
            })
          }
        }
      } else if (existingRequest.status === 'declined') {
        // Reset declined request to pending
        await supabase
          .from('message_requests')
          .update({
            from_user_id: session.userId,
            to_user_id: toUserId,
            status: 'pending',
            message: message?.trim() || '',
            created_at: new Date().toISOString()
          })
          .eq('id', existingRequest.id)

        return NextResponse.json({ success: true, message: 'Message request sent' })
      }
    }

    // Insert new pending request
    const { data: newReq, error } = await supabase
      .from('message_requests')
      .insert({
        from_user_id: session.userId,
        to_user_id: toUserId,
        status: 'pending',
        message: message?.trim() || ''
      })
      .select('id, from_user_id, to_user_id, status, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, request: newReq, message: 'Message request sent successfully' })
  } catch (err: any) {
    console.error('Request send error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
