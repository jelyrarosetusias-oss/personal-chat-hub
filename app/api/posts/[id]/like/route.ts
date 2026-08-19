import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUser()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: postId } = await params
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    // Check if like exists
    const { data: existingLike } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', session.userId)
      .maybeSingle()

    let liked = false

    if (existingLike) {
      // Unlike
      await supabase
        .from('post_likes')
        .delete()
        .eq('id', existingLike.id)
      liked = false
    } else {
      // Like
      await supabase
        .from('post_likes')
        .insert({
          post_id: postId,
          user_id: session.userId
        })
      liked = true

      // Trigger notification for post author (if not self-like)
      try {
        const { data: post } = await supabase
          .from('posts')
          .select('author_id')
          .eq('id', postId)
          .single()

        if (post && post.author_id !== session.userId) {
          await supabase.from('notifications').insert({
            recipient_id: post.author_id,
            actor_id: session.userId,
            type: 'like',
            post_id: postId
          })
        }
      } catch (notifErr) {
        console.warn('Like notification error:', notifErr)
      }
    }

    // Fetch total likes count
    const { count } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)

    return NextResponse.json({
      success: true,
      liked,
      likes_count: count || 0
    })
  } catch (err: any) {
    console.error('Post like toggle error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
