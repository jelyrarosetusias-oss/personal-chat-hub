import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUser()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: postId } = await params
    const { content, media_urls } = await req.json()

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    // Verify post ownership
    const { data: existingPost, error: fetchErr } = await supabase
      .from('posts')
      .select('id, author_id')
      .eq('id', postId)
      .single()

    if (fetchErr || !existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (existingPost.author_id !== session.userId && !session.isAdmin) {
      return NextResponse.json({ error: 'You do not have permission to edit this post' }, { status: 403 })
    }

    const finalMediaUrls: string[] = Array.isArray(media_urls) ? media_urls : []

    if (!content?.trim() && finalMediaUrls.length === 0) {
      return NextResponse.json({ error: 'Post cannot be empty' }, { status: 400 })
    }

    const updatePayload: any = {
      content: content?.trim() || null,
      media_url: finalMediaUrls[0] || null,
      media_urls: JSON.stringify(finalMediaUrls),
      media_type: finalMediaUrls.length > 0 ? 'image' : null,
      updated_at: new Date().toISOString()
    }

    const { data: updatedPost, error: updateErr } = await supabase
      .from('posts')
      .update(updatePayload)
      .eq('id', postId)
      .select('id, author_id, content, media_url, media_urls, media_type, repost_of_id, updated_at, created_at')
      .single()

    if (updateErr || !updatedPost) {
      console.error('Post update error:', updateErr)
      return NextResponse.json({ error: updateErr?.message || 'Failed to update post' }, { status: 500 })
    }

    // Parse media_urls cleanly
    let urls: string[] = []
    if (updatedPost.media_urls) {
      if (typeof updatedPost.media_urls === 'string') {
        try { urls = JSON.parse(updatedPost.media_urls) } catch { urls = [] }
      } else if (Array.isArray(updatedPost.media_urls)) {
        urls = updatedPost.media_urls
      }
    }
    if (urls.length === 0 && updatedPost.media_url) {
      urls = [updatedPost.media_url]
    }

    return NextResponse.json({
      success: true,
      post: {
        ...updatedPost,
        media_urls: urls
      }
    })
  } catch (err: any) {
    console.error('Edit post error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
