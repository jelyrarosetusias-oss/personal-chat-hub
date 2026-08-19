import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await params
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ comments: [] })
    }

    const { data: comments, error } = await supabase
      .from('post_comments')
      .select('id, post_id, author_id, content, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!comments || comments.length === 0) {
      return NextResponse.json({ comments: [] })
    }

    const authorIds = Array.from(new Set(comments.map((c) => c.author_id).filter(Boolean)))
    let profileMap: Record<string, any> = {}
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, short_id, username, display_name, avatar_url, is_admin')
        .in('id', authorIds)

      if (profiles) {
        for (const p of profiles) {
          profileMap[p.id] = p
        }
      }
    }

    const formattedComments = comments.map((c: any) => ({
      ...c,
      author: profileMap[c.author_id] || {
        id: c.author_id,
        display_name: 'User',
        username: 'user',
        short_id: '000000',
        avatar_url: null,
        is_admin: false
      }
    }))

    return NextResponse.json({ comments: formattedComments })
  } catch (err: any) {
    console.error('Fetch post comments error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUser()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: postId } = await params
    const { content } = await req.json()

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Comment text is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    // Verify user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, short_id, username, display_name, avatar_url, is_admin, is_banned')
      .eq('id', session.userId)
      .single()

    if (profile?.is_banned) {
      return NextResponse.json({ error: 'You are banned from commenting' }, { status: 403 })
    }

    const { data: newComment, error: insertErr } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        author_id: session.userId,
        content: content.trim()
      })
      .select('id, post_id, author_id, content, created_at')
      .single()

    if (insertErr || !newComment) {
      return NextResponse.json({ error: insertErr?.message || 'Failed to post comment' }, { status: 500 })
    }

    const formattedComment = {
      ...newComment,
      author: profile
    }

    return NextResponse.json({ success: true, comment: formattedComment })
  } catch (err: any) {
    console.error('Post comment error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
