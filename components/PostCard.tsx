'use client'

import React, { useState } from 'react'
import { UserProfile, Post, PostComment, DEFAULT_AVATAR } from '@/lib/types'
import {
  Heart,
  MessageCircle,
  Repeat,
  MoreVertical,
  Trash2,
  Send,
  Shield,
  X,
  Maximize2,
  CornerDownRight
} from 'lucide-react'

interface PostCardProps {
  post: Post
  currentUser: UserProfile
  onPostUpdated?: (updated: Post) => void
  onPostDeleted?: (postId: string) => void
  onRepostRequested?: (post: Post) => void
}

export default function PostCard({
  post,
  currentUser,
  onPostUpdated,
  onPostDeleted,
  onRepostRequested
}: PostCardProps) {
  const [liked, setLiked] = useState(post.is_liked_by_me || false)
  const [likesCount, setLikesCount] = useState(post.likes_count || 0)
  const [repostsCount, setRepostsCount] = useState(post.reposts_count || 0)

  // Comments State
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<PostComment[]>([])
  const [commentText, setCommentText] = useState('')
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0)
  const [loadingComments, setLoadingComments] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)

  // UI Modals & Popovers
  const [showMenu, setShowMenu] = useState(false)
  const [showLightbox, setShowLightbox] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isAuthor = post.author_id === currentUser.id
  const canDelete = isAuthor || currentUser.is_admin

  // 1. Toggle Like (0ms Optimistic)
  const handleToggleLike = async () => {
    const nextLiked = !liked
    const nextCount = nextLiked ? likesCount + 1 : Math.max(0, likesCount - 1)

    setLiked(nextLiked)
    setLikesCount(nextCount)

    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setLiked(data.liked)
        setLikesCount(data.likes_count)
      } else {
        // Rollback on error
        setLiked(!nextLiked)
        setLikesCount(likesCount)
      }
    } catch {
      setLiked(!nextLiked)
      setLikesCount(likesCount)
    }
  }

  // 2. Load Comments
  const handleToggleComments = async () => {
    if (!showComments && comments.length === 0) {
      setLoadingComments(true)
      try {
        const res = await fetch(`/api/posts/${post.id}/comments`)
        const data = await res.json()
        if (res.ok) {
          setComments(data.comments || [])
        }
      } catch (err) {
        console.error('Fetch comments error:', err)
      } finally {
        setLoadingComments(false)
      }
    }
    setShowComments(!showComments)
  }

  // 3. Submit Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim() || submittingComment) return

    setSubmittingComment(true)
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText.trim() })
      })
      const data = await res.json()

      if (res.ok && data.comment) {
        setComments((prev) => [...prev, data.comment])
        setCommentsCount((prev) => prev + 1)
        setCommentText('')
      }
    } catch (err) {
      console.error('Submit comment error:', err)
    } finally {
      setSubmittingComment(false)
    }
  }

  // 4. Delete Post
  const handleDeletePost = async () => {
    if (!window.confirm('Delete this post?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/posts/${post.id}/delete`, { method: 'POST' })
      if (res.ok && onPostDeleted) {
        onPostDeleted(post.id)
      }
    } catch (err) {
      console.error('Delete post error:', err)
    } finally {
      setDeleting(false)
      setShowMenu(false)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    try {
      const now = Date.now()
      const diffSecs = Math.floor((now - new Date(dateString).getTime()) / 1000)
      if (diffSecs < 60) return 'Just now'
      const diffMins = Math.floor(diffSecs / 60)
      if (diffMins < 60) return `${diffMins}m ago`
      const diffHours = Math.floor(diffMins / 60)
      if (diffHours < 24) return `${diffHours}h ago`
      const diffDays = Math.floor(diffHours / 24)
      if (diffDays < 7) return `${diffDays}d ago`
      return new Date(dateString).toLocaleDateString([], { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  return (
    <article className="bg-white rounded-2xl md-card border border-[#e8eaed] overflow-hidden space-y-3 p-3.5 sm:p-4 shadow-xs">
      {/* Post Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={post.author?.avatar_url || DEFAULT_AVATAR}
            alt={post.author?.display_name || 'User'}
            className="w-10 h-10 rounded-full bg-[#f1f4f8] object-cover ring-1 ring-[#e8eaed] shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-bold text-[#1f1f1f] truncate">
                {post.author?.display_name || 'User'}
              </span>
              {post.author?.is_admin && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#fef7e0] text-[#b06000] border border-[#fce8b2] shrink-0">
                  <Shield className="w-2.5 h-2.5" /> ADMIN
                </span>
              )}
            </div>
            <p className="text-[10px] text-[#5f6368] font-mono">
              #{post.author?.short_id} • @{post.author?.username} • {formatTimeAgo(post.created_at)}
            </p>
          </div>
        </div>

        {/* 3-dots Menu for Delete */}
        {canDelete && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-full hover:bg-[#f1f4f8] text-[#9aa0a6] hover:text-[#1f1f1f] transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-xl border border-[#e8eaed] p-1 z-40 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={handleDeletePost}
                    disabled={deleting}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#d93025] hover:bg-[#fce8e6] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Post</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Post Text Content */}
      {post.content && (
        <p className="text-xs sm:text-sm text-[#1f1f1f] leading-relaxed break-words whitespace-pre-wrap">
          {post.content}
        </p>
      )}

      {/* Post Photo Display */}
      {post.media_url && (
        <div
          onClick={() => setShowLightbox(true)}
          className="relative rounded-2xl overflow-hidden border border-[#e8eaed] bg-black/5 max-h-[480px] cursor-pointer group flex items-center justify-center"
        >
          <img
            src={post.media_url}
            alt="Post media"
            className="w-full max-h-[480px] object-cover transition-transform group-hover:scale-[1.01]"
          />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
            <Maximize2 className="w-6 h-6 drop-shadow-md" />
          </div>
        </div>
      )}

      {/* Nested Repost Card (If this post quotes/shares another post) */}
      {post.repost_of && (
        <div className="p-3 rounded-2xl bg-[#f8fafb] border border-[#e8eaed] space-y-2.5">
          <div className="flex items-center gap-2">
            <CornerDownRight className="w-3.5 h-3.5 text-[#1a73e8]" />
            <img
              src={post.repost_of.author?.avatar_url || DEFAULT_AVATAR}
              alt=""
              className="w-6 h-6 rounded-full bg-white object-cover ring-1 ring-[#e8eaed]"
            />
            <span className="text-xs font-semibold text-[#1f1f1f]">
              {post.repost_of.author?.display_name || 'User'}
            </span>
            <span className="text-[10px] font-mono text-[#5f6368]">
              #{post.repost_of.author?.short_id}
            </span>
          </div>

          {post.repost_of.content && (
            <p className="text-xs text-[#3c4043] line-clamp-3">{post.repost_of.content}</p>
          )}

          {post.repost_of.media_url && (
            <img
              src={post.repost_of.media_url}
              alt="Reposted media"
              className="w-full max-h-56 rounded-xl object-cover border border-[#e8eaed]"
            />
          )}
        </div>
      )}

      {/* Engagement Counter Strip */}
      <div className="flex items-center justify-between text-[11px] text-[#5f6368] pt-1 px-1">
        <div className="flex items-center gap-1">
          {likesCount > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-4 h-4 rounded-full bg-[#fce8e6] text-[#d93025] flex items-center justify-center text-[10px]">
                ❤️
              </span>
              <span>{likesCount} {likesCount === 1 ? 'like' : 'likes'}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {commentsCount > 0 && (
            <span>{commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}</span>
          )}
          {repostsCount > 0 && (
            <span>{repostsCount} {repostsCount === 1 ? 'repost' : 'reposts'}</span>
          )}
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="grid grid-cols-3 gap-1 pt-1 border-t border-[#f1f4f8]">
        {/* Like Button */}
        <button
          onClick={handleToggleLike}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
            liked
              ? 'text-[#d93025] bg-[#fce8e6]/50'
              : 'text-[#5f6368] hover:bg-[#f1f4f8] hover:text-[#1f1f1f]'
          }`}
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-[#d93025] text-[#d93025]' : ''}`} />
          <span>{liked ? 'Liked' : 'Like'}</span>
        </button>

        {/* Comment Button */}
        <button
          onClick={handleToggleComments}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
            showComments
              ? 'text-[#1a73e8] bg-[#e8f0fe]'
              : 'text-[#5f6368] hover:bg-[#f1f4f8] hover:text-[#1f1f1f]'
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          <span>Comment</span>
        </button>

        {/* Repost Button */}
        <button
          onClick={() => onRepostRequested && onRepostRequested(post)}
          className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-[#5f6368] hover:bg-[#f1f4f8] hover:text-[#1e8e3e] transition-colors active:scale-95"
        >
          <Repeat className="w-4 h-4" />
          <span>Repost</span>
        </button>
      </div>

      {/* Expandable Comments Thread */}
      {showComments && (
        <div className="space-y-3 pt-2 border-t border-[#f1f4f8] animate-fade-in">
          {/* Add Comment Input */}
          <form onSubmit={handleAddComment} className="flex items-center gap-2">
            <img
              src={currentUser.avatar_url || DEFAULT_AVATAR}
              alt=""
              className="w-7 h-7 rounded-full bg-[#f1f4f8] object-cover ring-1 ring-[#e8eaed] shrink-0"
            />
            <div className="flex-1 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f1f4f8] border border-transparent focus-within:border-[#1a73e8] focus-within:bg-white transition-all">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="w-full text-xs bg-transparent outline-none text-[#1f1f1f] placeholder-[#9aa0a6]"
              />
              <button
                type="submit"
                disabled={submittingComment || !commentText.trim()}
                className="text-[#1a73e8] hover:text-[#1557b0] disabled:opacity-30 transition-opacity p-0.5"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Comments List */}
          {loadingComments ? (
            <div className="p-3 text-center text-xs text-[#9aa0a6]">Loading comments...</div>
          ) : comments.length === 0 ? (
            <p className="text-center text-[11px] text-[#9aa0a6] py-1">No comments yet. Be the first to comment!</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2 text-xs">
                  <img
                    src={c.author?.avatar_url || DEFAULT_AVATAR}
                    alt=""
                    className="w-6 h-6 rounded-full bg-[#f1f4f8] object-cover ring-1 ring-[#e8eaed] shrink-0 mt-0.5"
                  />
                  <div className="flex-1 bg-[#f1f4f8] p-2.5 rounded-2xl rounded-tl-sm space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1f1f1f]">{c.author?.display_name || 'User'}</span>
                      <span className="text-[9px] text-[#9aa0a6]">{formatTimeAgo(c.created_at)}</span>
                    </div>
                    <p className="text-[#3c4043] leading-relaxed break-words">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lightbox Full Photo Modal */}
      {showLightbox && post.media_url && (
        <div
          onClick={() => setShowLightbox(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl">
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={post.media_url}
              alt="Full view"
              className="w-full h-full object-contain max-h-[85vh] rounded-2xl"
            />
          </div>
        </div>
      )}
    </article>
  )
}
