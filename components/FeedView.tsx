'use client'

import React, { useState, useEffect } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/swr-fetcher'
import { UserProfile, Post, DEFAULT_AVATAR } from '@/lib/types'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'
import CreatePostBox from '@/components/CreatePostBox'
import PostCard from '@/components/PostCard'
import { Sparkles, Repeat, X, Send, Loader2, Image as ImageIcon } from 'lucide-react'

interface FeedViewProps {
  currentUser: UserProfile
}

export default function FeedView({ currentUser }: FeedViewProps) {
  // SWR: Feed Posts
  const { data, mutate, isLoading } = useSWR('/api/posts', fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 2000
  })

  const posts: Post[] = data?.posts || []

  // Repost Modal State
  const [repostTarget, setRepostTarget] = useState<Post | null>(null)
  const [repostQuote, setRepostQuote] = useState('')
  const [submittingRepost, setSubmittingRepost] = useState(false)

  // Realtime subscription for live posts
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return

    const channel = supabase
      .channel('feed-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        mutate()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, () => {
        mutate()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments' }, () => {
        mutate()
      })
      .subscribe()

    return () => {
      if (supabase) {
        supabase.removeChannel(channel)
      }
    }
  }, [mutate])

  const handlePostCreated = (newPost: Post) => {
    mutate((curr: any) => ({ posts: [newPost, ...(curr?.posts || [])] }), false)
  }

  const handlePostDeleted = (deletedId: string) => {
    mutate((curr: any) => ({ posts: (curr?.posts || []).filter((p: Post) => p.id !== deletedId) }), false)
  }

  const handleConfirmRepost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!repostTarget || submittingRepost) return

    setSubmittingRepost(true)
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: repostQuote.trim() || null,
          repost_of_id: repostTarget.id
        })
      })
      const resData = await res.json()
      if (res.ok && resData.post) {
        handlePostCreated(resData.post)
        setRepostTarget(null)
        setRepostQuote('')
      }
    } catch (err) {
      console.error('Repost error:', err)
    } finally {
      setSubmittingRepost(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto h-full flex flex-col min-h-0 overflow-y-auto space-y-4 px-2 sm:px-4 py-2 pb-16">
      {/* Create Post Box */}
      <CreatePostBox currentUser={currentUser} onPostCreated={handlePostCreated} />

      {/* Feed Stream */}
      <div className="space-y-4">
        {isLoading && !data ? (
          <div className="p-8 text-center text-xs text-[#5f6368] flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 text-[#1a73e8] animate-spin" />
            <span>Loading feed...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-2xl md-card border border-[#e8eaed] p-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#1f1f1f]">No posts yet</h3>
            <p className="text-xs text-[#5f6368] max-w-xs mx-auto">
              Be the first to share a thought or photo with the community!
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              onPostDeleted={handlePostDeleted}
              onRepostRequested={(target) => setRepostTarget(target)}
            />
          ))
        )}
      </div>

      {/* Repost Quote Modal */}
      {repostTarget && (
        <div
          onClick={() => setRepostTarget(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl border border-[#e8eaed] space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-[#f1f4f8] pb-2">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-[#1e8e3e]" />
                <h3 className="text-sm font-bold text-[#1f1f1f]">Repost to Feed</h3>
              </div>
              <button
                onClick={() => setRepostTarget(null)}
                className="p-1 rounded-full hover:bg-[#f1f4f8] text-[#5f6368]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmRepost} className="space-y-3">
              <textarea
                value={repostQuote}
                onChange={(e) => setRepostQuote(e.target.value)}
                placeholder="Add your thoughts or quote... (optional)"
                rows={2}
                className="w-full text-xs sm:text-sm text-[#1f1f1f] placeholder-[#9aa0a6] bg-[#f8fafb] p-3 rounded-2xl border border-[#e8eaed] outline-none resize-none focus:border-[#1a73e8]"
              />

              {/* Target Post Preview */}
              <div className="p-3 rounded-2xl bg-[#f8fafb] border border-[#e8eaed] space-y-2">
                <div className="flex items-center gap-2">
                  <img
                    src={repostTarget.author?.avatar_url || DEFAULT_AVATAR}
                    alt=""
                    className="w-6 h-6 rounded-full bg-white object-cover ring-1 ring-[#e8eaed]"
                  />
                  <span className="text-xs font-semibold text-[#1f1f1f]">
                    {repostTarget.author?.display_name || 'User'}
                  </span>
                  <span className="text-[10px] font-mono text-[#5f6368]">
                    #{repostTarget.author?.short_id}
                  </span>
                </div>
                {repostTarget.content && (
                  <p className="text-xs text-[#3c4043] line-clamp-3">{repostTarget.content}</p>
                )}
                {repostTarget.media_url && (
                  <img
                    src={repostTarget.media_url}
                    alt=""
                    className="w-full max-h-48 rounded-xl object-cover"
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRepostTarget(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-[#5f6368] hover:bg-[#f1f4f8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRepost}
                  className="px-5 py-2 rounded-xl bg-[#1e8e3e] hover:bg-[#137333] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingRepost ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Repeat className="w-3.5 h-3.5" />}
                  <span>Repost</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
