import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getSessionUser, COOKIE_NAME } from '@/lib/auth'

export async function POST() {
  try {
    const session = await getSessionUser()
    if (session?.userId) {
      const supabase = getSupabaseAdmin()
      if (supabase) {
        await supabase
          .from('profiles')
          .update({ is_online: false, last_active_at: new Date().toISOString() })
          .eq('id', session.userId)
      }
    }

    const res = NextResponse.json({ success: true })
    res.cookies.delete(COOKIE_NAME)
    return res
  } catch (err: any) {
    console.error('Logout error:', err)
    return NextResponse.json({ error: err.message || 'Logout error' }, { status: 500 })
  }
}
