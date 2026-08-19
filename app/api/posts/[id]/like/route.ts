import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth'

const VALID_REACTIONS = ['like', 'love', 'haha', 'wow', 'sad', 'angry']

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUser()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: postId } = await params
    const body = await req.json().catch(() => ({}))
    const requestedReaction = body?.reaction_type && VALID_REACTIONS.includes(body.reaction_type)
      ? body.reaction_type
      : 'like'

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    // Check if like / reaction exists
    const { data: existingLike } = await supabase
      .from('post_likes')
      .select('id, reaction_type')
      .eq('post_id', postId)
      .eq('user_id', session.userId)
      .maybeSingle()

    let liked = false
    let currentReaction: string | null = null

    if (existingLike) {
      if (existingLike.reaction_type === requestedReaction && !body?.force_set) {
        // Toggle off (unlike)
        await supabase
          .from('post_likes')
          .delete()
          .eq('id', existingLike.id)
        liked = false
        currentReaction = null
      } else {
        // Change reaction type (e.g. from like to love)
        await supabase
          .from('post_likes')
          .update({ reaction_type: requestedReaction })
          .eq('id', existingLike.id)
        liked = true
        currentReaction = requestedReaction
      }
    } else {
      // New reaction
      await supabase
        .from('post_likes')
        .insert({
          post_id: postId,
          user_id: session.userId,
          reaction_type: requestedReaction
        })
      liked = true
      currentReaction = requestedReaction

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

    // Fetch all likes and compute reaction breakdown
    const { data: allLikes } = await supabase
      .from('post_likes')
      .select('reaction_type')
      .eq('post_id', postId)

    const breakdown: Record<string, number> = {}
    if (allLikes) {
      for (const row of allLikes) {
        const rType = row.reaction_type || 'like'
        breakdown[rType] = (breakdown[rType] || 0) + 1
      }
    }

    return NextResponse.json({
      success: true,
      liked,
      my_reaction: currentReaction,
      likes_count: allLikes?.length || 0,
      reactions_breakdown: breakdown
    })
  } catch (err: any) {
    console.error('Post reaction toggle error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
