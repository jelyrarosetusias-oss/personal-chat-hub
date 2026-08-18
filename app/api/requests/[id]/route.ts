import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUser()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { action } = await req.json()

    if (action !== 'accept' && action !== 'decline') {
      return NextResponse.json({ error: 'Action must be accept or decline' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    // Verify request exists and current user is recipient
    const { data: request, error: reqErr } = await supabase
      .from('message_requests')
      .select('id, from_user_id, to_user_id, status')
      .eq('id', id)
      .single()

    if (reqErr || !request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (request.to_user_id !== session.userId) {
      return NextResponse.json({ error: 'You are not authorized to respond to this request' }, { status: 403 })
    }

    if (action === 'decline') {
      await supabase
        .from('message_requests')
        .update({ status: 'declined' })
        .eq('id', id)

      return NextResponse.json({ success: true, status: 'declined' })
    }

    // Action is ACCEPT:
    // 1. Mark request accepted
    await supabase
      .from('message_requests')
      .update({ status: 'accepted' })
      .eq('id', id)

    // 2. Create or find conversation
    const { data: newConv, error: convErr } = await supabase
      .from('conversations')
      .insert({
        type: 'dm',
        created_by: session.userId
      })
      .select('id')
      .single()

    if (convErr || !newConv) {
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    }

    // 3. Add both members
    await supabase.from('conversation_members').insert([
      { conversation_id: newConv.id, user_id: session.userId, role: 'member' },
      { conversation_id: newConv.id, user_id: request.from_user_id, role: 'member' }
    ])

    return NextResponse.json({
      success: true,
      status: 'accepted',
      conversation_id: newConv.id
    })
  } catch (err: any) {
    console.error('Request response error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
