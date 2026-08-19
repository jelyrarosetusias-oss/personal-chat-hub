'use client'

import React, { useState, use } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { fetcher } from '@/lib/swr-fetcher'
import { UserProfile, Post, DEFAULT_AVATAR } from '@/lib/types'
import PostCard from '@/components/PostCard'
import ProfileModal from '@/components/ProfileModal'
import {
  ArrowLeft,
  Shield,
  MessageSquare,
  Edit3,
  Calendar,
  Heart,
  MessageCircle,
  FileText,
  Loader2,
  Share2,
  Check,
  Copy,
  Camera
} from 'lucide-react'

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: profileUserId } = use(params)
  const router = useRouter()

  // SWR: Session
  const { data: sessionData, mutate: mutateSession } = useSWR('/api/auth/session', fetcher)
  const currentUser: UserProfile | null = sessionData?.user || null

  // SWR: Profile Data + Posts + Stats
  const { data: profileData, mutate: mutateProfile, isLoading } = useSWR(
    profileUserId ? `/api/profile/${profileUserId}` : null,
    fetcher
  )

  const profile: UserProfile | null = profileData?.profile || null
  const posts: Post[] = profileData?.posts || []
  const stats = profileData?.stats || { posts_count: 0, likes_count: 0, comments_count: 0 }

  const [showEditModal, setShowEditModal] = useState(false)
  const [copiedId, setCopiedId] = useState(false)

  const isOwnProfile = currentUser?.id === profileUserId

  const handleCopyId = () => {
    if (!profile) return
    navigator.clipboard.writeText(profile.short_id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  const handleStartMessage = async () => {
    if (!currentUser || isOwnProfile) return
    try {
      // Send a message request or open existing DM
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_user_id: profileUserId,
          message: `Hi ${profile?.display_name || ''}!`
        })
      })
      router.push('/')
    } catch {
      router.push('/')
    }
  }

  if (isLoading && !profileData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafb]">
        <div className="flex items-center gap-2 text-xs text-[#5f6368]">
          <Loader2 className="w-4 h-4 text-[#1a73e8] animate-spin" />
          <span>Loading profile...</span>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#f8fafb] space-y-3">
        <h2 className="text-base font-bold text-[#1f1f1f]">User not found</h2>
        <Link
          href="/"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1a73e8] text-white text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </Link>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#f0f2f5] pb-16">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#e8eaed] px-3 sm:px-6 py-2.5 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-semibold text-[#5f6368] hover:text-[#1a73e8] transition-colors p-1 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden xs:inline">Back to Feed</span>
        </Link>

        <h1 className="text-sm font-bold text-[#1f1f1f] truncate max-w-xs">{profile.display_name}</h1>

        <div className="w-16 flex justify-end">
          <button
            onClick={handleCopyId}
            className="flex items-center gap-1 text-xs font-mono font-bold text-[#1a73e8] bg-[#e8f0fe] px-2.5 py-1 rounded-full hover:bg-[#d2e3fc] transition-colors"
            title="Copy Chat ID"
          >
            {copiedId ? <Check className="w-3 h-3 text-[#1e8e3e]" /> : <Copy className="w-3 h-3" />}
            <span>#{profile.short_id}</span>
          </button>
        </div>
      </header>

      {/* Profile Container */}
      <div className="max-w-3xl mx-auto px-2 sm:px-4 pt-3 space-y-4">
        {/* Profile Card with Cover Banner */}
        <div className="bg-white rounded-3xl md-card border border-[#e8eaed] overflow-hidden shadow-xs">
          {/* Cover Photo Banner */}
          <div className="h-36 sm:h-48 w-full relative overflow-hidden">
            {profile.cover_url ? (
              <img
                src={profile.cover_url}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-[#1a73e8] via-[#8ab4f8] to-[#4285f4]" />
            )}
            <div className="absolute inset-0 bg-black/10" />
            {isOwnProfile && (
              <button
                onClick={() => setShowEditModal(true)}
                className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-[#1f1f1f] text-[11px] font-bold shadow-sm transition-colors backdrop-blur-sm"
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{profile.cover_url ? 'Change Cover' : 'Add Cover Photo'}</span>
              </button>
            )}
          </div>

          {/* Profile Header Details */}
          <div className="px-4 sm:px-6 pb-6 pt-0 relative">
            {/* Avatar Row */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-16 sm:-mt-20 gap-3 pb-3">
              <div className="relative inline-block">
                <img
                  src={profile.avatar_url || DEFAULT_AVATAR}
                  alt={profile.display_name}
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-white object-cover ring-4 ring-white shadow-lg shrink-0"
                />
                {profile.is_online && (
                  <span className="absolute bottom-2 right-2 w-5 h-5 rounded-full bg-[#1e8e3e] ring-4 ring-white" />
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {isOwnProfile ? (
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#f1f4f8] hover:bg-[#e8eaed] text-[#1f1f1f] text-xs font-bold transition-all shadow-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStartMessage}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-2xl bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-bold transition-all shadow-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Message</span>
                  </button>
                )}
              </div>
            </div>

            {/* Identity Info */}
            <div className="space-y-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-2xl font-bold text-[#1f1f1f]">{profile.display_name}</h2>
                  {profile.is_admin && (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fef7e0] text-[#b06000] border border-[#fce8b2]">
                      <Shield className="w-3 h-3" /> ADMIN
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#5f6368] font-mono">
                  @{profile.username} • #{profile.short_id}
                </p>
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="text-xs sm:text-sm text-[#3c4043] leading-relaxed max-w-xl">
                  {profile.bio}
                </p>
              )}

              {/* Stats Bar */}
              <div className="flex items-center gap-4 sm:gap-6 pt-3 border-t border-[#f1f4f8] text-xs text-[#5f6368]">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#1a73e8]" />
                  <span><strong>{stats.posts_count}</strong> {stats.posts_count === 1 ? 'post' : 'posts'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-[#d93025]" />
                  <span><strong>{stats.likes_count}</strong> {stats.likes_count === 1 ? 'like' : 'likes'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-[#1e8e3e]" />
                  <span><strong>{stats.comments_count}</strong> {stats.comments_count === 1 ? 'comment' : 'comments'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User's Posts Feed */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-[#1f1f1f] px-1">Posts</h3>

          {posts.length === 0 ? (
            <div className="bg-white rounded-3xl md-card border border-[#e8eaed] p-8 text-center space-y-1">
              <p className="text-xs font-semibold text-[#1f1f1f]">No posts yet</p>
              <p className="text-[11px] text-[#5f6368]">
                {isOwnProfile ? "You haven't posted anything yet." : `${profile.display_name} hasn't posted anything yet.`}
              </p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={currentUser || profile}
                onPostDeleted={() => mutateProfile()}
                onPostUpdated={() => mutateProfile()}
              />
            ))
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && currentUser && (
        <ProfileModal
          user={currentUser}
          onSave={(updated) => {
            mutateSession({ user: updated }, false)
            mutateProfile()
            setShowEditModal(false)
          }}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </main>
  )
}
