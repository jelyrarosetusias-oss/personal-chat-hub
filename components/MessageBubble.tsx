'use client'

import React, { useState } from 'react'
import { DirectMessage } from '@/lib/mock-store'
import { X, Maximize2, Smile, Undo2 } from 'lucide-react'

const REACTION_EMOJIS = ['❤️', '😂', '👍', '🔥', '😮', '😢']

interface MessageBubbleProps {
  message: DirectMessage
  isOwnerView: boolean
  currentUserName: string
  onReact: (messageId: string, emoji: string) => void
  onUnsend: (messageId: string) => void
}

export default function MessageBubble({ message, isOwnerView, currentUserName, onReact, onUnsend }: MessageBubbleProps) {
  const [showFullImage, setShowFullImage] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [showContextMenu, setShowContextMenu] = useState(false)

  const isOwnerSender = message.sender_type === 'owner'
  const isMine = isOwnerView ? isOwnerSender : !isOwnerSender

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  const defaultAvatar = isOwnerSender
    ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=owner-alex'
    : `https://api.dicebear.com/7.x/bottts/svg?seed=${message.sender_name}`

  // Collect all reactions
  const reactions = message.reactions || {}
  const reactionEntries = Object.entries(reactions).filter(([, reactors]) => reactors.length > 0)

  if (message.unsent) {
    return (
      <div className={`flex items-end gap-2.5 my-2.5 ${isOwnerSender ? 'flex-row-reverse' : 'flex-row'}`}>
        <img
          src={message.avatar_url || defaultAvatar}
          alt={message.sender_name}
          className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-[#e8eaed] opacity-40"
        />
        <div className={`max-w-[78%] sm:max-w-[62%] flex flex-col ${isOwnerSender ? 'items-end' : 'items-start'}`}>
          <div className={`flex items-center gap-1.5 px-0.5 mb-1 text-[11px] ${isOwnerSender ? 'flex-row-reverse' : ''}`}>
            <span className="font-semibold text-[#9aa0a6]">{message.sender_name}</span>
            <span className="text-[#dadce0]">•</span>
            <span className="text-[#dadce0]">{formatTime(message.created_at)}</span>
          </div>
          <div className="px-4 py-2.5 text-[0.8125rem] italic text-[#9aa0a6] bg-[#f1f4f8] rounded-[1.25rem] border border-dashed border-[#dadce0]">
            ⚠️ This message was unsent
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`group flex items-end gap-2.5 my-2.5 ${isOwnerSender ? 'flex-row-reverse' : 'flex-row'}`}
      onMouseLeave={() => { setShowReactionPicker(false); setShowContextMenu(false) }}
    >
      {/* Avatar */}
      <img
        src={message.avatar_url || defaultAvatar}
        alt={message.sender_name}
        className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-[#e8eaed]"
      />

      {/* Bubble Container */}
      <div className={`max-w-[78%] sm:max-w-[62%] flex flex-col ${isOwnerSender ? 'items-end' : 'items-start'}`}>
        {/* Sender + Time */}
        <div className={`flex items-center gap-1.5 px-0.5 mb-1 text-[11px] ${isOwnerSender ? 'flex-row-reverse' : ''}`}>
          <span className="font-semibold text-[#3c4043]">{message.sender_name}</span>
          <span className="text-[#9aa0a6]">•</span>
          <span className="text-[#9aa0a6]">{formatTime(message.created_at)}</span>
        </div>

        {/* Bubble + Hover Actions */}
        <div className="relative">
          <div
            className={`p-3 text-[0.8125rem] leading-relaxed break-words space-y-2 ${
              isOwnerSender
                ? 'bg-[#1a73e8] text-white rounded-[1.25rem] rounded-br-[0.375rem] shadow-sm'
                : 'bg-[#f1f4f8] text-[#1f1f1f] rounded-[1.25rem] rounded-bl-[0.375rem] border border-[#e8eaed]'
            }`}
          >
            {/* Image */}
            {message.media_url && (
              <div
                onClick={() => setShowFullImage(true)}
                className="relative cursor-pointer rounded-xl overflow-hidden group/img max-w-[280px] border border-black/10"
              >
                <img
                  src={message.media_url}
                  alt="Attached Media"
                  className="w-full max-h-60 object-cover transition-transform group-hover/img:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Maximize2 className="w-5 h-5 drop-shadow-md" />
                </div>
              </div>
            )}

            {/* Text */}
            {message.content && <div>{message.content}</div>}
          </div>

          {/* Hover Action Buttons (react + unsend) */}
          <div className={`absolute top-0 ${isOwnerSender ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1'} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5`}>
            <button
              onClick={() => { setShowReactionPicker(!showReactionPicker); setShowContextMenu(false) }}
              className="p-1.5 rounded-full hover:bg-[#f1f4f8] text-[#9aa0a6] hover:text-[#5f6368] transition-colors"
              title="React"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>
            {isMine && (
              <button
                onClick={() => { setShowContextMenu(!showContextMenu); setShowReactionPicker(false) }}
                className="p-1.5 rounded-full hover:bg-[#f1f4f8] text-[#9aa0a6] hover:text-[#5f6368] transition-colors"
                title="Unsend"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Reaction Picker Popover */}
          {showReactionPicker && (
            <div className={`absolute bottom-full mb-1 ${isOwnerSender ? 'right-0' : 'left-0'} flex items-center gap-0.5 p-1.5 md-card shadow-lg z-30`}>
              {REACTION_EMOJIS.map((emoji) => {
                const reactors = reactions[emoji] || []
                const hasReacted = reactors.includes(currentUserName)
                return (
                  <button
                    key={emoji}
                    onClick={() => { onReact(message.id, emoji); setShowReactionPicker(false) }}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all hover:scale-125 ${
                      hasReacted ? 'bg-[#d3e3fd]' : 'hover:bg-[#f1f4f8]'
                    }`}
                  >
                    {emoji}
                  </button>
                )
              })}
            </div>
          )}

          {/* Unsend Confirm Popover */}
          {showContextMenu && isMine && (
            <div className={`absolute bottom-full mb-1 ${isOwnerSender ? 'right-0' : 'left-0'} md-card shadow-lg z-30 p-2 w-40 space-y-1`}>
              <p className="text-[10px] text-[#5f6368] px-2 pb-1 border-b border-[#e8eaed]">Message actions</p>
              <button
                onClick={() => { onUnsend(message.id); setShowContextMenu(false) }}
                className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-[#d93025] font-medium rounded-lg hover:bg-[#fce8e6] transition-colors"
              >
                <Undo2 className="w-3.5 h-3.5" /> Unsend Message
              </button>
            </div>
          )}
        </div>

        {/* Reaction Chips */}
        {reactionEntries.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isOwnerSender ? 'justify-end' : 'justify-start'}`}>
            {reactionEntries.map(([emoji, reactors]) => {
              const hasReacted = reactors.includes(currentUserName)
              return (
                <button
                  key={emoji}
                  onClick={() => onReact(message.id, emoji)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all ${
                    hasReacted
                      ? 'bg-[#d3e3fd] border-[#1a73e8]/30 text-[#1a73e8]'
                      : 'bg-[#f1f4f8] border-[#e8eaed] text-[#5f6368] hover:bg-[#e8eaed]'
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="font-medium text-[10px]">{reactors.length}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Fullsize Image Lightbox */}
      {showFullImage && message.media_url && (
        <div
          onClick={() => setShowFullImage(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="relative max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl">
            <button
              onClick={() => setShowFullImage(false)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={message.media_url}
              alt="Full Media"
              className="w-full h-full object-contain max-h-[85vh] rounded-2xl"
            />
          </div>
        </div>
      )}
    </div>
  )
}
