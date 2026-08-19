import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser()
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ posts: [] })
    }

    // 1. Fetch recent posts (includes media_urls + updated_at)
    const { data: posts, error } = await supabase
      .from('posts')
      .select('id, author_id, content, media_url, media_urls, media_type, repost_of_id, updated_at, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Fetch posts error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({ posts: [] })
    }

    const postIds = posts.map((p) => p.id)
    const repostTargetIds = Array.from(new Set(posts.map((p) => p.repost_of_id).filter(Boolean))) as string[]

    // 2. Parallel queries
    const [likesRes, commentsRes, repostRowsRes, repostTargetsRes] = await Promise.all([
      supabase.from('post_likes').select('post_id, user_id, reaction_type').in('post_id', postIds),
      supabase.from('post_comments').select('id, post_id').in('post_id', postIds),
      supabase.from('posts').select('repost_of_id').in('repost_of_id', postIds),
      repostTargetIds.length > 0
        ? supabase.from('posts').select('id, author_id, content, media_url, media_urls, media_type, created_at').in('id', repostTargetIds)
        : Promise.resolve({ data: [] })
    ])

    const repostTargets = (repostTargetsRes as any)?.data || []

    // 3. Collect all author IDs
    const allAuthorIds = Array.from(
      new Set([
        ...posts.map((p) => p.author_id),
        ...repostTargets.map((r: any) => r.author_id)
      ].filter(Boolean))
    ) as string[]

    // 4. Fetch all author profiles
    let profileMap: Record<string, any> = {}
    if (allAuthorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, short_id, username, display_name, avatar_url, is_admin, is_online, last_active_at')
        .in('id', allAuthorIds)

      if (profiles) {
        for (const p of profiles) {
          profileMap[p.id] = p
        }
      }
    }

    // 5. Index likes + reactions breakdown
    const likesMap: Record<string, { count: number; isLiked: boolean; myReaction: string | null; breakdown: Record<string, number> }> = {}
    if (likesRes.data) {
      for (const row of likesRes.data as any[]) {
        if (!likesMap[row.post_id]) {
          likesMap[row.post_id] = { count: 0, isLiked: false, myReaction: null, breakdown: {} }
        }
        likesMap[row.post_id].count++
        const rType = row.reaction_type || 'like'
        likesMap[row.post_id].breakdown[rType] = (likesMap[row.post_id].breakdown[rType] || 0) + 1
        if (session?.userId && row.user_id === session.userId) {
          likesMap[row.post_id].isLiked = true
          likesMap[row.post_id].myReaction = rType
        }
      }
    }

    // 6. Index comments count
    const commentsCountMap: Record<string, number> = {}
    if (commentsRes.data) {
      for (const row of commentsRes.data) {
        commentsCountMap[row.post_id] = (commentsCountMap[row.post_id] || 0) + 1
      }
    }

    // 7. Index repost count
    const repostCounts: Record<string, number> = {}
    if (repostRowsRes.data) {
      for (const row of repostRowsRes.data) {
        if (row.repost_of_id) {
          repostCounts[row.repost_of_id] = (repostCounts[row.repost_of_id] || 0) + 1
        }
      }
    }

    // 8. Index repost targets
    const repostTargetMap: Record<string, any> = {}
    for (const r of repostTargets) {
      repostTargetMap[r.id] = {
        ...r,
        media_urls: resolveMediaUrls(r),
        author: profileMap[r.author_id] || {
          id: r.author_id,
          display_name: 'User',
          username: 'user',
          short_id: '000000',
          avatar_url: null,
          is_admin: false
        }
      }
    }

    // 9. Format posts response
    const formattedPosts = posts.map((p: any) => {
      const likeInfo = likesMap[p.id] || { count: 0, isLiked: false, myReaction: null, breakdown: {} }
      const author = profileMap[p.author_id] || {
        id: p.author_id,
        display_name: 'User',
        username: 'user',
        short_id: '000000',
        avatar_url: null,
        is_admin: false,
        is_online: false,
        last_active_at: null
      }

      return {
        id: p.id,
        author_id: p.author_id,
        author,
        content: p.content,
        media_url: p.media_url,
        media_urls: resolveMediaUrls(p),
        media_type: p.media_type,
        repost_of_id: p.repost_of_id,
        repost_of: p.repost_of_id ? repostTargetMap[p.repost_of_id] || null : null,
        likes_count: likeInfo.count,
        reactions_breakdown: likeInfo.breakdown,
        my_reaction: likeInfo.myReaction,
        comments_count: commentsCountMap[p.id] || 0,
        reposts_count: repostCounts[p.id] || 0,
        is_liked_by_me: likeInfo.isLiked,
        updated_at: p.updated_at,
        created_at: p.created_at
      }
    })

    return NextResponse.json({ posts: formattedPosts })
  } catch (err: any) {
    console.error('Posts GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content, media_url, media_urls, media_type, repost_of_id } = await req.json()

    // Resolve final media_urls array
    const finalMediaUrls: string[] = media_urls && Array.isArray(media_urls) && media_urls.length > 0
      ? media_urls
      : media_url ? [media_url] : []

    if (!content?.trim() && finalMediaUrls.length === 0 && !repost_of_id) {
      return NextResponse.json({ error: 'Post must have content, image, or repost reference' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    // Verify user is not banned
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('is_banned, display_name, avatar_url, short_id, username, is_admin')
      .eq('id', session.userId)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    if (userProfile.is_banned) {
      return NextResponse.json({ error: 'You are banned and cannot publish posts' }, { status: 403 })
    }

    const { data: newPost, error: insertErr } = await supabase
      .from('posts')
      .insert({
        author_id: session.userId,
        content: content?.trim() || null,
        media_url: finalMediaUrls[0] || null,
        media_urls: JSON.stringify(finalMediaUrls),
        media_type: media_type || (finalMediaUrls.length > 0 ? 'image' : null),
        repost_of_id: repost_of_id || null
      })
      .select('id, author_id, content, media_url, media_urls, media_type, repost_of_id, updated_at, created_at')
      .single()

    if (insertErr || !newPost) {
      console.error('Post insert error:', insertErr)
      return NextResponse.json({ error: insertErr?.message || 'Failed to create post' }, { status: 500 })
    }

    // If this is a repost, fetch the target
    let repostTarget = null
    if (newPost.repost_of_id) {
      const { data: targetPost } = await supabase
        .from('posts')
        .select('id, author_id, content, media_url, media_urls, media_type, created_at')
        .eq('id', newPost.repost_of_id)
        .single()

      if (targetPost) {
        const { data: targetAuthor } = await supabase
          .from('profiles')
          .select('id, short_id, username, display_name, avatar_url, is_admin')
          .eq('id', targetPost.author_id)
          .single()

        repostTarget = {
          ...targetPost,
          media_urls: resolveMediaUrls(targetPost),
          author: targetAuthor || null
        }

        // Trigger notification for the original post author
        if (targetPost.author_id !== session.userId) {
          try {
            await supabase.from('notifications').insert({
              recipient_id: targetPost.author_id,
              actor_id: session.userId,
              type: 'repost',
              post_id: newPost.id,
              content_preview: content?.slice(0, 80) || null
            })
          } catch (notifErr) {
            console.warn('Repost notification trigger error:', notifErr)
          }
        }
      }
    }

    const formattedPost = {
      ...newPost,
      media_urls: resolveMediaUrls(newPost),
      author: {
        id: session.userId,
        short_id: userProfile.short_id,
        username: userProfile.username,
        display_name: userProfile.display_name,
        avatar_url: userProfile.avatar_url,
        is_admin: userProfile.is_admin
      },
      repost_of: repostTarget,
      likes_count: 0,
      reactions_breakdown: {},
      my_reaction: null,
      comments_count: 0,
      reposts_count: 0,
      is_liked_by_me: false
    }

    return NextResponse.json({ success: true, post: formattedPost })
  } catch (err: any) {
    console.error('Post create error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Helper: resolve media_urls from both old media_url and new media_urls columns
function resolveMediaUrls(post: any): string[] {
  // media_urls could be a JSON string or already-parsed array
  let urls: string[] = []
  if (post.media_urls) {
    if (typeof post.media_urls === 'string') {
      try { urls = JSON.parse(post.media_urls) } catch { urls = [] }
    } else if (Array.isArray(post.media_urls)) {
      urls = post.media_urls
    }
  }
  // Backwards compat: if media_urls is empty but media_url exists, use it
  if (urls.length === 0 && post.media_url) {
    urls = [post.media_url]
  }
  return urls.filter(Boolean)
}
