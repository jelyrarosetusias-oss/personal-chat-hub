import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { target_user_id, action } = await req.json()
    if (!target_user_id) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    // Get current user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('blocked_users, restricted_users')
      .eq('id', session.userId)
      .single()

    let blocked = (profile?.blocked_users as string[]) || []
    let restricted = (profile?.restricted_users as string[]) || []

    if (action === 'block') {
      blocked = Array.from(new Set([...blocked, target_user_id]))
    } else if (action === 'unblock') {
      blocked = blocked.filter((id) => id !== target_user_id)
    } else if (action === 'restrict') {
      restricted = Array.from(new Set([...restricted, target_user_id]))
    } else if (action === 'unrestrict') {
      restricted = restricted.filter((id) => id !== target_user_id)
    }

    await supabase
      .from('profiles')
      .update({
        blocked_users: blocked,
        restricted_users: restricted
      })
      .eq('id', session.userId)

    return NextResponse.json({
      success: true,
      action,
      blocked_users: blocked,
      restricted_users: restricted
    })
  } catch (err: any) {
    console.error('Block/restrict error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
