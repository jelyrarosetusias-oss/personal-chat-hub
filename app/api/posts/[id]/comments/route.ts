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
      .select('id, post_id, author_id, content, parent_comment_id, created_at')
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

    const formattedList = comments.map((c: any) => ({
      id: c.id,
      post_id: c.post_id,
      author_id: c.author_id,
      content: c.content,
      parent_comment_id: c.parent_comment_id || null,
      created_at: c.created_at,
      author: profileMap[c.author_id] || {
        id: c.author_id,
        display_name: 'User',
        username: 'user',
        short_id: '000000',
        avatar_url: null,
        is_admin: false
      },
      replies: [] as any[]
    }))

    // Nest replies under parents in-memory
    const commentMap: Record<string, any> = {}
    const topLevelComments: any[] = []

    for (const item of formattedList) {
      commentMap[item.id] = item
    }

    for (const item of formattedList) {
      if (item.parent_comment_id && commentMap[item.parent_comment_id]) {
        commentMap[item.parent_comment_id].replies.push(item)
      } else {
        topLevelComments.push(item)
      }
    }

    return NextResponse.json({ comments: topLevelComments })
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
    const { content, parent_comment_id } = await req.json()

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
        content: content.trim(),
        parent_comment_id: parent_comment_id || null
      })
      .select('id, post_id, author_id, content, parent_comment_id, created_at')
      .single()

    if (insertErr || !newComment) {
      return NextResponse.json({ error: insertErr?.message || 'Failed to post comment' }, { status: 500 })
    }

    // Trigger notification
    try {
      const contentSnippet = content.trim().slice(0, 80)

      if (parent_comment_id) {
        // Notification for the parent comment author
        const { data: parentComment } = await supabase
          .from('post_comments')
          .select('author_id')
          .eq('id', parent_comment_id)
          .single()

        if (parentComment && parentComment.author_id !== session.userId) {
          await supabase.from('notifications').insert({
            recipient_id: parentComment.author_id,
            actor_id: session.userId,
            type: 'reply',
            post_id: postId,
            comment_id: newComment.id,
            content_preview: contentSnippet
          })
        }
      } else {
        // Notification for the post author
        const { data: post } = await supabase
          .from('posts')
          .select('author_id')
          .eq('id', postId)
          .single()

        if (post && post.author_id !== session.userId) {
          await supabase.from('notifications').insert({
            recipient_id: post.author_id,
            actor_id: session.userId,
            type: 'comment',
            post_id: postId,
            comment_id: newComment.id,
            content_preview: contentSnippet
          })
        }
      }
    } catch (notifErr) {
      console.warn('Comment notification trigger error:', notifErr)
    }

    const formattedComment = {
      ...newComment,
      author: profile,
      replies: []
    }

    return NextResponse.json({ success: true, comment: formattedComment })
  } catch (err: any) {
    console.error('Post comment error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
