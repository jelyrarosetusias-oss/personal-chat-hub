import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')?.trim()

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ users: [] })
    }

    const cleanQuery = query.toUpperCase()
    const cleanLower = query.toLowerCase()

    // Search by exact short_id (case insensitive) or username/display_name ILIKE
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, short_id, username, display_name, avatar_url, bio, is_online, last_active_at')
      .neq('id', session.userId)
      .eq('is_banned', false)
      .or(`short_id.eq.${cleanQuery},username.ilike.%${cleanLower}%,display_name.ilike.%${query}%`)
      .limit(10)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ users: users || [] })
  } catch (err: any) {
    console.error('Search error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
