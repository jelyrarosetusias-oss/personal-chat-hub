'use client'

import React, { useState } from 'react'
import { UserProfile, Conversation } from '@/lib/types'
import { ArrowLeft, Users, Info, Copy, Check } from 'lucide-react'
import { formatOfflineDuration } from '@/lib/time-utils'

interface ChatHeaderProps {
  currentUser: UserProfile
  conversation: Conversation
  onBack: () => void
  onOpenGroupInfo?: () => void
}

export default function ChatHeader({
  currentUser,
  conversation,
  onBack,
  onOpenGroupInfo
}: ChatHeaderProps) {
  const isGroup = conversation.type === 'group'
  const otherMember = !isGroup ? conversation.members?.find((m) => m.id !== currentUser.id) : null

  const title = isGroup ? conversation.name : otherMember?.display_name || 'Direct Message'
  const avatar = isGroup
    ? conversation.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${conversation.id}`
    : otherMember?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=user`

  const [copiedId, setCopiedId] = useState(false)

  const handleCopyOtherId = () => {
    if (!otherMember?.short_id) return
    navigator.clipboard.writeText(otherMember.short_id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  return (
    <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 border-b border-[#e8eaed] shrink-0 bg-white/90 backdrop-blur-sm z-20">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {/* Mobile Back button */}
        <button
          onClick={onBack}
          className="p-1.5 -ml-1 rounded-full hover:bg-[#f1f4f8] text-[#5f6368] transition-colors md:hidden shrink-0"
          title="Back to conversations"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Avatar */}
        <div className="relative shrink-0">
          <img
            src={avatar}
            alt={title || 'Avatar'}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#f1f4f8] object-cover ring-1 ring-[#e8eaed]"
          />
          {!isGroup && otherMember?.is_online && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#1e8e3e] ring-2 ring-white" />
          )}
        </div>

        {/* Title & Status */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-xs sm:text-sm font-bold text-[#1f1f1f] truncate">{title}</h2>
            {!isGroup && otherMember?.short_id && (
              <button
                onClick={handleCopyOtherId}
                className="font-mono text-[10px] text-[#1a73e8] hover:underline flex items-center gap-0.5 shrink-0"
                title="Click to copy ID"
              >
                <span>#{otherMember.short_id}</span>
                {copiedId && <Check className="w-2.5 h-2.5 text-[#1e8e3e]" />}
              </button>
            )}
          </div>

          <p className="text-[10px] sm:text-[11px] text-[#5f6368] truncate">
            {isGroup ? (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3 text-[#1a73e8]" />
                {conversation.members?.length || 0} members
              </span>
            ) : otherMember?.is_online ? (
              <span className="text-[#1e8e3e] font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1e8e3e]" /> Online now
              </span>
            ) : (
              <span>{formatOfflineDuration(otherMember?.last_active_at)} {otherMember?.bio ? `• "${otherMember.bio}"` : ''}</span>
            )}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      {isGroup && onOpenGroupInfo && (
        <button
          onClick={onOpenGroupInfo}
          className="p-2 rounded-full hover:bg-[#f1f4f8] text-[#5f6368] transition-colors"
          title="Group Info & Members"
        >
          <Info className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
