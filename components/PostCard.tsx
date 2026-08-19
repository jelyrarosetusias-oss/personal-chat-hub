'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { UserProfile, Post, PostComment, PostReactionType, DEFAULT_AVATAR } from '@/lib/types'
import {
  Heart,
  MessageCircle,
  Repeat,
  MoreVertical,
  Trash2,
  Edit2,
  Send,
  Shield,
  X,
  ChevronLeft,
  ChevronRight,
  CornerDownRight,
  Reply,
  Check,
  Loader2
} from 'lucide-react'

// ─── Reaction Emoji Config ───
const REACTION_EMOJIS: { type: PostReactionType; emoji: string; label: string; color: string }[] = [
  { type: 'like', emoji: '👍', label: 'Like', color: '#1a73e8' },
  { type: 'love', emoji: '❤️', label: 'Love', color: '#d93025' },
  { type: 'haha', emoji: '😂', label: 'Haha', color: '#f9ab00' },
  { type: 'wow', emoji: '😮', label: 'Wow', color: '#f9ab00' },
  { type: 'sad', emoji: '😢', label: 'Sad', color: '#f9ab00' },
  { type: 'angry', emoji: '😡', label: 'Angry', color: '#ea4335' },
]

function getReactionEmoji(type: string): string {
  return REACTION_EMOJIS.find((r) => r.type === type)?.emoji || '👍'
}

function getReactionColor(type: string): string {
  return REACTION_EMOJIS.find((r) => r.type === type)?.color || '#1a73e8'
}

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
  const [myReaction, setMyReaction] = useState<PostReactionType | null>(post.my_reaction || null)
  const [reactionsBreakdown, setReactionsBreakdown] = useState<Record<string, number>>(post.reactions_breakdown || {})
  const [repostsCount, setRepostsCount] = useState(post.reposts_count || 0)

  // Edit State
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(post.content || '')
  const [savingEdit, setSavingEdit] = useState(false)

  // Comments State
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<PostComment[]>([])
  const [commentText, setCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState<PostComment | null>(null)
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0)
  const [loadingComments, setLoadingComments] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)

  // UI Modals & Lightbox
  const [showMenu, setShowMenu] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showReactionDock, setShowReactionDock] = useState(false)
  const [showPostDetail, setShowPostDetail] = useState(false)
  const reactionTimeout = useRef<NodeJS.Timeout | null>(null)

  const isAuthor = post.author_id === currentUser.id
  const canDelete = isAuthor || currentUser.is_admin
  const canEdit = isAuthor

  const images: string[] = post.media_urls && post.media_urls.length > 0
    ? post.media_urls
    : post.media_url ? [post.media_url] : []

  // ─── Reaction Handlers ───
  const handleReaction = async (reactionType: PostReactionType) => {
    setShowReactionDock(false)

    // Optimistic
    const prevLiked = liked
    const prevCount = likesCount
    const prevReaction = myReaction
    const prevBreakdown = { ...reactionsBreakdown }

    if (myReaction === reactionType) {
      // Toggle off
      setLiked(false)
      setMyReaction(null)
      setLikesCount(Math.max(0, likesCount - 1))
      const newBreakdown = { ...reactionsBreakdown }
      newBreakdown[reactionType] = Math.max(0, (newBreakdown[reactionType] || 1) - 1)
      if (newBreakdown[reactionType] === 0) delete newBreakdown[reactionType]
      setReactionsBreakdown(newBreakdown)
    } else {
      // New or changed reaction
      setLiked(true)
      setMyReaction(reactionType)
      if (!prevReaction) {
        setLikesCount(likesCount + 1)
      }
      const newBreakdown = { ...reactionsBreakdown }
      if (prevReaction) {
        newBreakdown[prevReaction] = Math.max(0, (newBreakdown[prevReaction] || 1) - 1)
        if (newBreakdown[prevReaction] === 0) delete newBreakdown[prevReaction]
      }
      newBreakdown[reactionType] = (newBreakdown[reactionType] || 0) + 1
      setReactionsBreakdown(newBreakdown)
    }

    try {
      const res = await fetch(`/api/posts/${post.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction_type: reactionType })
      })
      const data = await res.json()
      if (res.ok) {
        setLiked(data.liked)
        setLikesCount(data.likes_count)
        setMyReaction(data.my_reaction || null)
        setReactionsBreakdown(data.reactions_breakdown || {})
      } else {
        // Revert
        setLiked(prevLiked)
        setLikesCount(prevCount)
        setMyReaction(prevReaction)
        setReactionsBreakdown(prevBreakdown)
      }
    } catch {
      setLiked(prevLiked)
      setLikesCount(prevCount)
      setMyReaction(prevReaction)
      setReactionsBreakdown(prevBreakdown)
    }
  }

  const handleLikeButtonClick = () => {
    if (liked && myReaction) {
      // Unlike (toggle off current reaction)
      handleReaction(myReaction)
    } else {
      // Default like
      handleReaction('like')
    }
  }

  const handleLikeHoverEnter = () => {
    reactionTimeout.current = setTimeout(() => setShowReactionDock(true), 500)
  }

  const handleLikeHoverLeave = () => {
    if (reactionTimeout.current) clearTimeout(reactionTimeout.current)
  }

  // ─── Comments ───
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

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim() || submittingComment) return

    setSubmittingComment(true)
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: commentText.trim(),
          parent_comment_id: replyingTo ? replyingTo.id : null
        })
      })
      const data = await res.json()

      if (res.ok && data.comment) {
        if (replyingTo) {
          // Add reply to the correct parent (recursively)
          setComments((prev) => addReplyToComment(prev, replyingTo.id, data.comment))
        } else {
          setComments((prev) => [...prev, data.comment])
        }
        setCommentsCount((prev) => prev + 1)
        setCommentText('')
        setReplyingTo(null)
      }
    } catch (err) {
      console.error('Submit comment error:', err)
    } finally {
      setSubmittingComment(false)
    }
  }

  // ─── Edit Post ───
  const handleSaveEdit = async () => {
    if (!editContent.trim() && images.length === 0) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/posts/${post.id}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editContent.trim(),
          media_urls: images
        })
      })
      const data = await res.json()
      if (res.ok && data.post) {
        setIsEditing(false)
        if (onPostUpdated) {
          onPostUpdated({
            ...post,
            content: editContent.trim(),
            updated_at: data.post.updated_at
          })
        }
      }
    } catch (err) {
      console.error('Save edit error:', err)
    } finally {
      setSavingEdit(false)
    }
  }

  // ─── Delete Post ───
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

  // ─── Reaction Summary Badges ───
  const renderReactionBadges = () => {
    const entries = Object.entries(reactionsBreakdown).filter(([, count]) => count > 0)
    if (entries.length === 0 && likesCount === 0) return null

    // Sort by count descending, take top 3
    entries.sort((a, b) => b[1] - a[1])
    const topReactions = entries.slice(0, 3)

    return (
      <span className="flex items-center gap-1">
        <span className="flex -space-x-0.5">
          {topReactions.map(([type]) => (
            <span
              key={type}
              className="w-[18px] h-[18px] rounded-full bg-white ring-1 ring-white flex items-center justify-center text-[11px] shadow-xs"
            >
              {getReactionEmoji(type)}
            </span>
          ))}
        </span>
        <span className="text-[11px] text-[#5f6368]">
          {likesCount}
        </span>
      </span>
    )
  }

  // ─── Post Content Click (opens detail modal) ───
  const handlePostContentClick = (e: React.MouseEvent) => {
    // Don't open if clicking a link, button, or interactive element
    const target = e.target as HTMLElement
    if (
      target.closest('a') ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('[role="button"]')
    ) return
    setShowPostDetail(true)
    // Auto-load comments for detail view
    if (comments.length === 0) {
      setLoadingComments(true)
      fetch(`/api/posts/${post.id}/comments`)
        .then((r) => r.json())
        .then((data) => setComments(data.comments || []))
        .catch(() => {})
        .finally(() => setLoadingComments(false))
    }
  }

  return (
    <>
      <article className="bg-white rounded-2xl md-card border border-[#e8eaed] overflow-hidden space-y-3 p-3.5 sm:p-4 shadow-xs">
        {/* Post Header */}
        <div className="flex items-center justify-between">
          <Link
            href={`/profile/${post.author?.id || post.author_id}`}
            className="flex items-center gap-2.5 min-w-0 group hover:opacity-90 transition-opacity"
          >
            <img
              src={post.author?.avatar_url || DEFAULT_AVATAR}
              alt={post.author?.display_name || 'User'}
              className="w-10 h-10 rounded-full bg-[#f1f4f8] object-cover ring-1 ring-[#e8eaed] shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold text-[#1f1f1f] group-hover:text-[#1a73e8] transition-colors truncate">
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
                {post.updated_at && <span className="ml-1 text-[#9aa0a6] font-sans italic">(edited)</span>}
              </p>
            </div>
          </Link>

          {/* 3-dots Menu for Edit / Delete */}
          {(canDelete || canEdit) && (
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
                  <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-xl border border-[#e8eaed] p-1 z-40 animate-in fade-in zoom-in-95 duration-150 space-y-0.5">
                    {canEdit && (
                      <button
                        onClick={() => {
                          setIsEditing(true)
                          setShowMenu(false)
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#3c4043] hover:bg-[#f1f4f8] transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-[#5f6368]" />
                        <span>Edit Post</span>
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={handleDeletePost}
                        disabled={deleting}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#d93025] hover:bg-[#fce8e6] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Post</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Post Text Content or Inline Edit */}
        {isEditing ? (
          <div className="space-y-2 pt-1">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              className="w-full p-2.5 rounded-xl border border-[#1a73e8] text-xs sm:text-sm text-[#1f1f1f] bg-[#f8fafb] outline-none resize-none"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setEditContent(post.content || '')
                  setIsEditing(false)
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#5f6368] hover:bg-[#f1f4f8]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit || (!editContent.trim() && images.length === 0)}
                className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-bold shadow-xs disabled:opacity-50"
              >
                {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save</span>
              </button>
            </div>
          </div>
        ) : (
          post.content && (
            <p
              onClick={handlePostContentClick}
              className="text-xs sm:text-sm text-[#1f1f1f] leading-relaxed break-words whitespace-pre-wrap cursor-pointer"
            >
              {post.content}
            </p>
          )
        )}

        {/* Post Photo Display (Full Image or Multi-Image Gallery Grid) */}
        {images.length > 0 && (
          <div className="rounded-2xl overflow-hidden border border-[#e8eaed] bg-black/5">
            {images.length === 1 ? (
              <div
                onClick={() => setLightboxIndex(0)}
                className="relative w-full max-h-[520px] flex items-center justify-center bg-black/5 cursor-pointer group"
              >
                <img
                  src={images[0]}
                  alt="Post photo"
                  className="w-full max-h-[520px] object-contain rounded-2xl transition-transform group-hover:scale-[1.005]"
                />
              </div>
            ) : images.length === 2 ? (
              <div className="grid grid-cols-2 gap-1 max-h-[380px]">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setLightboxIndex(idx)}
                    className="relative aspect-square cursor-pointer overflow-hidden group bg-black/5"
                  >
                    <img
                      src={img}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                ))}
              </div>
            ) : images.length === 3 ? (
              <div className="grid grid-cols-3 gap-1 max-h-[400px]">
                <div
                  onClick={() => setLightboxIndex(0)}
                  className="col-span-2 relative aspect-[4/3] sm:aspect-square cursor-pointer overflow-hidden group bg-black/5"
                >
                  <img
                    src={images[0]}
                    alt="Photo 1"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <div className="col-span-1 grid grid-rows-2 gap-1">
                  {images.slice(1, 3).map((img, idx) => (
                    <div
                      key={idx + 1}
                      onClick={() => setLightboxIndex(idx + 1)}
                      className="relative cursor-pointer overflow-hidden group bg-black/5"
                    >
                      <img
                        src={img}
                        alt={`Photo ${idx + 2}`}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1 max-h-[420px]">
                {images.slice(0, 4).map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setLightboxIndex(idx)}
                    className="relative aspect-square cursor-pointer overflow-hidden group bg-black/5"
                  >
                    <img
                      src={img}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    {idx === 3 && images.length > 4 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-lg sm:text-xl">
                        +{images.length - 4}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Nested Repost Card */}
        {post.repost_of && (
          <div className="p-3 rounded-2xl bg-[#f8fafb] border border-[#e8eaed] space-y-2.5">
            <Link
              href={`/profile/${post.repost_of.author?.id || post.repost_of.author_id}`}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
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
            </Link>

            {post.repost_of.content && (
              <p className="text-xs text-[#3c4043] line-clamp-3">{post.repost_of.content}</p>
            )}

            {post.repost_of.media_urls && post.repost_of.media_urls.length > 0 && (
              <img
                src={post.repost_of.media_urls[0]}
                alt="Reposted media"
                className="w-full max-h-56 rounded-xl object-cover border border-[#e8eaed]"
              />
            )}
          </div>
        )}

        {/* Engagement Counter Strip */}
        <div className="flex items-center justify-between text-[11px] text-[#5f6368] pt-1 px-1">
          <div onClick={handlePostContentClick} className="cursor-pointer">
            {renderReactionBadges()}
          </div>

          <div className="flex items-center gap-3">
            {commentsCount > 0 && (
              <span className="cursor-pointer hover:underline" onClick={handleToggleComments}>
                {commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}
              </span>
            )}
            {repostsCount > 0 && (
              <span>{repostsCount} {repostsCount === 1 ? 'repost' : 'reposts'}</span>
            )}
          </div>
        </div>

        {/* Action Buttons Bar */}
        <div className="grid grid-cols-3 gap-1 pt-1 border-t border-[#f1f4f8]">
          {/* Like Button with Reaction Dock */}
          <div
            className="relative"
            onMouseEnter={handleLikeHoverEnter}
            onMouseLeave={handleLikeHoverLeave}
          >
            {/* Floating Reaction Dock */}
            {showReactionDock && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowReactionDock(false)} />
                <div
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex items-center gap-1 px-2 py-1.5 bg-white rounded-full shadow-xl border border-[#e8eaed] z-30 animate-in fade-in zoom-in-90 duration-150"
                  onMouseLeave={() => setShowReactionDock(false)}
                >
                  {REACTION_EMOJIS.map((r) => (
                    <button
                      key={r.type}
                      onClick={() => handleReaction(r.type)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-lg hover:scale-125 active:scale-95 transition-transform hover:bg-[#f1f4f8] ${
                        myReaction === r.type ? 'bg-[#e8f0fe] scale-110 ring-2 ring-[#1a73e8]/30' : ''
                      }`}
                      title={r.label}
                    >
                      {r.emoji}
                    </button>
                  ))}
                </div>
              </>
            )}

            <button
              onClick={handleLikeButtonClick}
              onTouchStart={() => {
                reactionTimeout.current = setTimeout(() => setShowReactionDock(true), 400)
              }}
              onTouchEnd={() => {
                if (reactionTimeout.current) clearTimeout(reactionTimeout.current)
              }}
              className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                liked
                  ? `bg-opacity-10`
                  : 'text-[#5f6368] hover:bg-[#f1f4f8] hover:text-[#1f1f1f]'
              }`}
              style={liked && myReaction ? { color: getReactionColor(myReaction) } : undefined}
            >
              {liked && myReaction ? (
                <span className="text-base leading-none">{getReactionEmoji(myReaction)}</span>
              ) : (
                <Heart className="w-4 h-4" />
              )}
              <span>{liked && myReaction ? REACTION_EMOJIS.find((r) => r.type === myReaction)?.label || 'Like' : 'Like'}</span>
            </button>
          </div>

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

        {/* Expandable Comments & Replies Thread */}
        {showComments && (
          <div className="space-y-3 pt-2 border-t border-[#f1f4f8] animate-fade-in">
            {/* Add Comment / Reply Composer */}
            <CommentComposer
              currentUser={currentUser}
              replyingTo={replyingTo}
              commentText={commentText}
              setCommentText={setCommentText}
              setReplyingTo={setReplyingTo}
              submittingComment={submittingComment}
              onSubmit={handleAddComment}
            />

            {/* Comments List (with unlimited nested replies) */}
            {loadingComments ? (
              <div className="p-3 text-center text-xs text-[#9aa0a6]">Loading comments...</div>
            ) : comments.length === 0 ? (
              <p className="text-center text-[11px] text-[#9aa0a6] py-1">No comments yet. Be the first to comment!</p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {comments.map((c) => (
                  <CommentThread
                    key={c.id}
                    comment={c}
                    depth={0}
                    currentUser={currentUser}
                    formatTimeAgo={formatTimeAgo}
                    onReply={setReplyingTo}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </article>

      {/* Lightbox Full Photo Carousel Modal */}
      {lightboxIndex !== null && images.length > 0 && (
        <div
          onClick={() => setLightboxIndex(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl max-h-[90vh] flex flex-col items-center justify-center"
          >
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute -top-10 right-0 p-1.5 rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors z-20"
            >
              <X className="w-5 h-5" />
            </button>

            {images.length > 1 && (
              <div className="absolute -top-10 left-0 text-xs font-semibold text-white/90">
                {lightboxIndex + 1} / {images.length}
              </div>
            )}

            {images.length > 1 && (
              <button
                onClick={() => setLightboxIndex((prev) => (prev! > 0 ? prev! - 1 : images.length - 1))}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors z-10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <img
              src={images[lightboxIndex]}
              alt={`Photo ${lightboxIndex + 1}`}
              className="w-full h-full object-contain max-h-[82vh] rounded-2xl shadow-2xl"
            />

            {images.length > 1 && (
              <button
                onClick={() => setLightboxIndex((prev) => (prev! < images.length - 1 ? prev! + 1 : 0))}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors z-10"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Post Detail Modal (Facebook-style click-to-focus) */}
      {showPostDetail && (
        <PostDetailModal
          post={post}
          currentUser={currentUser}
          images={images}
          liked={liked}
          likesCount={likesCount}
          myReaction={myReaction}
          reactionsBreakdown={reactionsBreakdown}
          commentsCount={commentsCount}
          comments={comments}
          loadingComments={loadingComments}
          replyingTo={replyingTo}
          commentText={commentText}
          submittingComment={submittingComment}
          formatTimeAgo={formatTimeAgo}
          renderReactionBadges={renderReactionBadges}
          onClose={() => setShowPostDetail(false)}
          onReaction={handleReaction}
          onLikeClick={handleLikeButtonClick}
          onToggleComments={handleToggleComments}
          onAddComment={handleAddComment}
          setCommentText={setCommentText}
          setReplyingTo={setReplyingTo}
        />
      )}
    </>
  )
}

// ─── Recursive Comment Thread (unlimited nesting) ───
function CommentThread({
  comment,
  depth,
  currentUser,
  formatTimeAgo,
  onReply
}: {
  comment: PostComment
  depth: number
  currentUser: UserProfile
  formatTimeAgo: (d: string) => string
  onReply: (c: PostComment) => void
}) {
  const [showReplies, setShowReplies] = useState(depth < 2) // Auto-expand first 2 levels
  const maxIndent = 4

  return (
    <div className="space-y-2">
      {/* Comment Bubble */}
      <div className="flex items-start gap-2 text-xs group">
        <Link href={`/profile/${comment.author?.id || comment.author_id}`}>
          <img
            src={comment.author?.avatar_url || DEFAULT_AVATAR}
            alt=""
            className={`rounded-full bg-[#f1f4f8] object-cover ring-1 ring-[#e8eaed] shrink-0 mt-0.5 ${depth > 0 ? 'w-5 h-5' : 'w-6 h-6'}`}
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="bg-[#f1f4f8] p-2.5 rounded-2xl rounded-tl-sm space-y-0.5 inline-block max-w-full">
            <div className="flex items-center gap-2">
              <Link
                href={`/profile/${comment.author?.id || comment.author_id}`}
                className="font-bold text-[#1f1f1f] hover:underline"
              >
                {comment.author?.display_name || 'User'}
              </Link>
              <span className="text-[9px] text-[#9aa0a6]">{formatTimeAgo(comment.created_at)}</span>
            </div>
            <p className="text-[#3c4043] leading-relaxed break-words">{comment.content}</p>
          </div>

          {/* Reply button + replies toggle */}
          <div className="flex items-center gap-3 pl-2 pt-0.5 text-[10px] text-[#5f6368]">
            <button
              onClick={() => onReply(comment)}
              className="font-semibold hover:text-[#1a73e8] transition-colors"
            >
              Reply
            </button>
            {comment.replies && comment.replies.length > 0 && !showReplies && (
              <button
                onClick={() => setShowReplies(true)}
                className="font-semibold hover:text-[#1a73e8] transition-colors flex items-center gap-1"
              >
                <CornerDownRight className="w-3 h-3" />
                {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Nested Replies (recursive, unlimited depth) */}
      {showReplies && comment.replies && comment.replies.length > 0 && (
        <div
          className="space-y-2 border-l-2 border-[#e8eaed]"
          style={{ marginLeft: Math.min(depth + 1, maxIndent) * 12 + 12 }}
        >
          {comment.replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              currentUser={currentUser}
              formatTimeAgo={formatTimeAgo}
              onReply={onReply}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Comment Composer ───
function CommentComposer({
  currentUser,
  replyingTo,
  commentText,
  setCommentText,
  setReplyingTo,
  submittingComment,
  onSubmit
}: {
  currentUser: UserProfile
  replyingTo: PostComment | null
  commentText: string
  setCommentText: (t: string) => void
  setReplyingTo: (c: PostComment | null) => void
  submittingComment: boolean
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-1.5">
      {replyingTo && (
        <div className="flex items-center justify-between px-3 py-1 rounded-xl bg-[#e8f0fe] text-xs text-[#1a73e8]">
          <span>Replying to <strong>@{replyingTo.author?.username || 'user'}</strong></span>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="p-0.5 hover:bg-black/10 rounded"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
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
            placeholder={replyingTo ? `Write a reply to @${replyingTo.author?.username}...` : 'Write a comment...'}
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
      </div>
    </form>
  )
}

// ─── Post Detail Modal (Facebook-style) ───
function PostDetailModal({
  post,
  currentUser,
  images,
  liked,
  likesCount,
  myReaction,
  reactionsBreakdown,
  commentsCount,
  comments,
  loadingComments,
  replyingTo,
  commentText,
  submittingComment,
  formatTimeAgo,
  renderReactionBadges,
  onClose,
  onReaction,
  onLikeClick,
  onToggleComments,
  onAddComment,
  setCommentText,
  setReplyingTo
}: {
  post: Post
  currentUser: UserProfile
  images: string[]
  liked: boolean
  likesCount: number
  myReaction: PostReactionType | null
  reactionsBreakdown: Record<string, number>
  commentsCount: number
  comments: PostComment[]
  loadingComments: boolean
  replyingTo: PostComment | null
  commentText: string
  submittingComment: boolean
  formatTimeAgo: (d: string) => string
  renderReactionBadges: () => React.ReactNode
  onClose: () => void
  onReaction: (t: PostReactionType) => void
  onLikeClick: () => void
  onToggleComments: () => void
  onAddComment: (e: React.FormEvent) => void
  setCommentText: (t: string) => void
  setReplyingTo: (c: PostComment | null) => void
}) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#e8eaed] overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="p-3.5 px-4 border-b border-[#f1f4f8] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={post.author?.avatar_url || DEFAULT_AVATAR}
              alt=""
              className="w-9 h-9 rounded-full object-cover ring-1 ring-[#e8eaed]"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#1f1f1f] truncate">
                {post.author?.display_name || 'User'}
              </p>
              <p className="text-[10px] text-[#5f6368] font-mono">
                {formatTimeAgo(post.created_at)}
                {post.updated_at && <span className="ml-1 italic font-sans">(edited)</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#f1f4f8] text-[#5f6368] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Post Content */}
          {post.content && (
            <div className="px-4 pt-3 pb-2">
              <p className="text-sm text-[#1f1f1f] leading-relaxed whitespace-pre-wrap">{post.content}</p>
            </div>
          )}

          {/* Post Images */}
          {images.length > 0 && (
            <div className="border-y border-[#e8eaed]">
              {images.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Photo ${idx + 1}`}
                  className="w-full object-contain max-h-[60vh] bg-black/5"
                />
              ))}
            </div>
          )}

          {/* Reaction Summary */}
          <div className="px-4 py-2 flex items-center justify-between text-[11px] text-[#5f6368] border-b border-[#f1f4f8]">
            <div>{renderReactionBadges()}</div>
            <div className="flex items-center gap-3">
              {commentsCount > 0 && (
                <span>{commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}</span>
              )}
            </div>
          </div>

          {/* Reaction Buttons */}
          <div className="px-4 py-1.5 border-b border-[#f1f4f8]">
            <div className="flex items-center justify-center gap-1.5">
              {REACTION_EMOJIS.map((r) => (
                <button
                  key={r.type}
                  onClick={() => onReaction(r.type)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                    myReaction === r.type
                      ? 'bg-[#e8f0fe] ring-1 ring-[#1a73e8]/30'
                      : 'hover:bg-[#f1f4f8]'
                  }`}
                  style={myReaction === r.type ? { color: r.color } : { color: '#5f6368' }}
                >
                  <span className="text-base">{r.emoji}</span>
                  <span className="hidden sm:inline">{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Comments Section */}
          <div className="px-4 py-3 space-y-3">
            {loadingComments ? (
              <div className="p-3 text-center text-xs text-[#9aa0a6]">Loading comments...</div>
            ) : comments.length === 0 ? (
              <p className="text-center text-[11px] text-[#9aa0a6] py-2">No comments yet. Be the first!</p>
            ) : (
              <div className="space-y-3">
                {comments.map((c) => (
                  <CommentThread
                    key={c.id}
                    comment={c}
                    depth={0}
                    currentUser={currentUser}
                    formatTimeAgo={formatTimeAgo}
                    onReply={setReplyingTo}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Comment Composer (pinned to bottom) */}
        <div className="p-3 px-4 border-t border-[#f1f4f8] shrink-0 bg-white">
          <CommentComposer
            currentUser={currentUser}
            replyingTo={replyingTo}
            commentText={commentText}
            setCommentText={setCommentText}
            setReplyingTo={setReplyingTo}
            submittingComment={submittingComment}
            onSubmit={onAddComment}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Helper: Recursively add a reply to the correct parent ───
function addReplyToComment(comments: PostComment[], parentId: string, newReply: PostComment): PostComment[] {
  return comments.map((c) => {
    if (c.id === parentId) {
      return { ...c, replies: [...(c.replies || []), newReply] }
    }
    if (c.replies && c.replies.length > 0) {
      return { ...c, replies: addReplyToComment(c.replies, parentId, newReply) }
    }
    return c
  })
}
