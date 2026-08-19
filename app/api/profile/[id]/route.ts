import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: userId } = await params
    const session = await getSessionUser()
    const supabase = getSupabaseAdmin()

    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    // 1. Fetch user profile
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, short_id, username, display_name, avatar_url, bio, is_admin, is_online, last_active_at, created_at')
      .eq('id', userId)
      .single()

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 2. Fetch user's posts
    const { data: posts, error: postsErr } = await supabase
      .from('posts')
      .select('id, author_id, content, media_url, media_urls, media_type, repost_of_id, updated_at, created_at')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })

    if (postsErr) {
      return NextResponse.json({ error: postsErr.message }, { status: 500 })
    }

    const postList = posts || []
    const postIds = postList.map((p) => p.id)

    // 3. Likes, comments, and repost data
    const [likesRes, commentsRes, repostRowsRes] = await Promise.all([
      postIds.length > 0 ? supabase.from('post_likes').select('post_id, user_id').in('post_id', postIds) : Promise.resolve({ data: [] }),
      postIds.length > 0 ? supabase.from('post_comments').select('id, post_id').in('post_id', postIds) : Promise.resolve({ data: [] }),
      postIds.length > 0 ? supabase.from('posts').select('repost_of_id').in('repost_of_id', postIds) : Promise.resolve({ data: [] })
    ])

    // Likes mapping & total likes count
    const likesMap: Record<string, { count: number; isLiked: boolean }> = {}
    let totalLikesReceived = 0

    if (likesRes.data) {
      for (const row of likesRes.data) {
        if (!likesMap[row.post_id]) {
          likesMap[row.post_id] = { count: 0, isLiked: false }
        }
        likesMap[row.post_id].count++
        totalLikesReceived++
        if (session?.userId && row.user_id === session.userId) {
          likesMap[row.post_id].isLiked = true
        }
      }
    }

    // Comments count mapping & total comments
    const commentsCountMap: Record<string, number> = {}
    let totalCommentsCount = 0

    if (commentsRes.data) {
      for (const row of commentsRes.data) {
        commentsCountMap[row.post_id] = (commentsCountMap[row.post_id] || 0) + 1
        totalCommentsCount++
      }
    }

    // Repost count mapping
    const repostCounts: Record<string, number> = {}
    if (repostRowsRes.data) {
      for (const row of repostRowsRes.data) {
        if (row.repost_of_id) {
          repostCounts[row.repost_of_id] = (repostCounts[row.repost_of_id] || 0) + 1
        }
      }
    }

    const formattedPosts = postList.map((p: any) => {
      let urls: string[] = []
      if (p.media_urls) {
        if (typeof p.media_urls === 'string') {
          try { urls = JSON.parse(p.media_urls) } catch { urls = [] }
        } else if (Array.isArray(p.media_urls)) {
          urls = p.media_urls
        }
      }
      if (urls.length === 0 && p.media_url) {
        urls = [p.media_url]
      }

      return {
        ...p,
        author: profile,
        media_urls: urls,
        likes_count: likesMap[p.id]?.count || 0,
        comments_count: commentsCountMap[p.id] || 0,
        reposts_count: repostCounts[p.id] || 0,
        is_liked_by_me: likesMap[p.id]?.isLiked || false
      }
    })

    return NextResponse.json({
      profile,
      posts: formattedPosts,
      stats: {
        posts_count: postList.length,
        likes_count: totalLikesReceived,
        comments_count: totalCommentsCount
      }
    })
  } catch (err: any) {
    console.error('Profile GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
