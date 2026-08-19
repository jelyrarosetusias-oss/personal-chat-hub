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

    // Fetch posts with author, likes, and comments in parallel
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        id,
        author_id,
        content,
        media_url,
        media_type,
        repost_of_id,
        created_at,
        author:profiles!posts_author_id_fkey(
          id, short_id, username, display_name, avatar_url, is_admin, is_online, last_active_at
        ),
        likes:post_likes(user_id),
        comments:post_comments(id),
        repost_of:posts!posts_repost_of_id_fkey(
          id,
          author_id,
          content,
          media_url,
          media_type,
          created_at,
          author:profiles!posts_author_id_fkey(
            id, short_id, username, display_name, avatar_url, is_admin
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Fetch posts error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Count reposts for each post
    const postIds = (posts || []).map((p) => p.id)
    const { data: repostRows } = await supabase
      .from('posts')
      .select('repost_of_id')
      .in('repost_of_id', postIds)

    const repostCounts: Record<string, number> = {}
    if (repostRows) {
      for (const row of repostRows) {
        if (row.repost_of_id) {
          repostCounts[row.repost_of_id] = (repostCounts[row.repost_of_id] || 0) + 1
        }
      }
    }

    const formattedPosts = (posts || []).map((p: any) => {
      const likesList = p.likes || []
      const isLikedByMe = session?.userId ? likesList.some((l: any) => l.user_id === session.userId) : false

      return {
        id: p.id,
        author_id: p.author_id,
        author: p.author,
        content: p.content,
        media_url: p.media_url,
        media_type: p.media_type,
        repost_of_id: p.repost_of_id,
        repost_of: p.repost_of,
        likes_count: likesList.length,
        comments_count: (p.comments || []).length,
        reposts_count: repostCounts[p.id] || 0,
        is_liked_by_me: isLikedByMe,
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

    const { content, media_url, media_type, repost_of_id } = await req.json()

    if (!content?.trim() && !media_url && !repost_of_id) {
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
        media_url: media_url || null,
        media_type: media_type || (media_url ? 'image' : undefined),
        repost_of_id: repost_of_id || null
      })
      .select(`
        id,
        author_id,
        content,
        media_url,
        media_type,
        repost_of_id,
        created_at,
        repost_of:posts!posts_repost_of_id_fkey(
          id,
          author_id,
          content,
          media_url,
          media_type,
          created_at,
          author:profiles!posts_author_id_fkey(
            id, short_id, username, display_name, avatar_url, is_admin
          )
        )
      `)
      .single()

    if (insertErr || !newPost) {
      console.error('Post insert error:', insertErr)
      return NextResponse.json({ error: insertErr?.message || 'Failed to create post' }, { status: 500 })
    }

    const formattedPost = {
      ...newPost,
      author: {
        id: session.userId,
        short_id: userProfile.short_id,
        username: userProfile.username,
        display_name: userProfile.display_name,
        avatar_url: userProfile.avatar_url,
        is_admin: userProfile.is_admin
      },
      likes_count: 0,
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
