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
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    // Delete conversation memberships for this user
    await supabase
      .from('conversation_members')
      .delete()
      .eq('conversation_id', id)
      .eq('user_id', session.userId)

    // Check if any members remain; if none, delete entire conversation
    const { data: remaining } = await supabase
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', id)

    if (!remaining || remaining.length === 0) {
      await supabase.from('conversations').delete().eq('id', id)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Delete conversation error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
