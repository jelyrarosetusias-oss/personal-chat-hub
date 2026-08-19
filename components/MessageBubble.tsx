'use client'

import React, { useState } from 'react'
import { ChatMessage, DEFAULT_AVATAR } from '@/lib/types'
import { X, Maximize2, Smile, Undo2, Check, CheckCheck } from 'lucide-react'

const REACTION_EMOJIS = ['❤️', '😂', '👍', '🔥', '😮', '😢']

interface MessageBubbleProps {
  message: ChatMessage
  currentUserId: string
  showAvatar?: boolean
  showSenderName?: boolean
  onReact: (messageId: string, emoji: string) => void
  onUnsend: (messageId: string) => void
}

export default function MessageBubble({
  message,
  currentUserId,
  showAvatar = true,
  showSenderName = false,
  onReact,
  onUnsend
}: MessageBubbleProps) {
  const [showFullMedia, setShowFullMedia] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [showContextMenu, setShowContextMenu] = useState(false)

  const isMine = message.sender_id === currentUserId

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  const defaultAvatar = message.sender_avatar || DEFAULT_AVATAR

  // Collect reactions
  const reactions = message.reactions || {}
  const reactionEntries = Object.entries(reactions).filter(([, reactors]) => reactors.length > 0)

  // Has any recipient seen this message?
  const isSeenByRecipient = Boolean(
    message.seen_by && message.seen_by.some((id) => id !== currentUserId)
  )

  if (message.unsent) {
    return (
      <div className={`flex items-end gap-2 my-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
        {!isMine && (
          showAvatar ? (
            <img
              src={defaultAvatar}
              alt=""
              className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-[#e8eaed] opacity-40 mb-0.5"
            />
          ) : (
            <div className="w-7 shrink-0" />
          )
        )}
        <div className={`max-w-[80%] sm:max-w-[65%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
          <div className="px-3.5 py-2 text-xs italic text-[#9aa0a6] bg-[#f1f4f8] rounded-[1.25rem] border border-dashed border-[#dadce0]">
            ⚠️ This message was unsent
          </div>
        </div>
      </div>
    )
  }

  const isVideo = message.media_type === 'video'

  const handleBubbleClick = () => {
    setShowReactionPicker((prev) => !prev)
    setShowContextMenu(false)
  }

  return (
    <div
      className={`group flex items-end gap-2 my-1 relative ${isMine ? 'justify-end' : 'justify-start'}`}
      onMouseLeave={() => { setShowReactionPicker(false); setShowContextMenu(false) }}
    >
      {/* Respondent Avatar (Only shown on the LAST message of a cluster, like Messenger) */}
      {!isMine && (
        showAvatar ? (
          <img
            src={defaultAvatar}
            alt={message.sender_name || 'Avatar'}
            className="w-7 h-7 rounded-full bg-[#f1f4f8] object-cover shrink-0 ring-1 ring-[#e8eaed] mb-0.5"
          />
        ) : (
          <div className="w-7 shrink-0" />
        )
      )}

      {/* Bubble Container */}
      <div className={`max-w-[82%] sm:max-w-[65%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
        {/* Group Sender Name (Only shown on FIRST message of cluster in groups) */}
        {!isMine && showSenderName && (
          <span className="text-[10px] font-semibold text-[#5f6368] mb-0.5 ml-1">
            {message.sender_name || 'User'}
          </span>
        )}

        {/* Bubble + Actions */}
        <div className="relative">
          {/* Reaction Picker Popover */}
          {showReactionPicker && (
            <>
              {/* Invisible backdrop for dismiss */}
              <div
                className="fixed inset-0 z-20"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowReactionPicker(false)
                }}
              />

              <div
                className={`absolute bottom-full mb-2 ${
                  isMine ? 'right-0' : 'left-0'
                } flex items-center gap-1 p-1.5 bg-white/95 backdrop-blur-md rounded-full border border-[#e8eaed] shadow-xl z-30 animate-in fade-in zoom-in-95 duration-150 max-w-[calc(100vw-2rem)] overflow-x-auto`}
                onClick={(e) => e.stopPropagation()}
              >
                {REACTION_EMOJIS.map((emoji) => {
                  const reactors = reactions[emoji] || []
                  const hasReacted = reactors.includes(currentUserId)
                  return (
                    <button
                      key={emoji}
                      onClick={() => {
                        onReact(message.id, emoji)
                        setShowReactionPicker(false)
                      }}
                      className={`w-9 h-9 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-lg sm:text-base transition-transform active:scale-125 hover:scale-125 ${
                        hasReacted ? 'bg-[#d3e3fd]' : 'hover:bg-[#f1f4f8]'
                      }`}
                    >
                      {emoji}
                    </button>
                  )
                })}

                {/* Mobile Unsend Button inside reaction capsule */}
                {isMine && (
                  <button
                    onClick={() => {
                      onUnsend(message.id)
                      setShowReactionPicker(false)
                    }}
                    className="w-9 h-9 sm:w-8 sm:h-8 ml-0.5 rounded-full flex items-center justify-center text-[#d93025] hover:bg-[#fce8e6] transition-colors"
                    title="Unsend message"
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </>
          )}

          {/* Unsend Confirm Popover (Desktop / Context) */}
          {showContextMenu && isMine && (
            <div className={`absolute bottom-full mb-1 ${isMine ? 'right-0' : 'left-0'} md-card shadow-lg z-30 p-2 w-40 space-y-1`}>
              <p className="text-[10px] text-[#5f6368] px-2 pb-1 border-b border-[#e8eaed]">Message actions</p>
              <button
                onClick={() => { onUnsend(message.id); setShowContextMenu(false) }}
                className="w-full flex items-center gap-2 px-2.5 py-2 text-xs text-[#d93025] font-medium rounded-lg hover:bg-[#fce8e6] transition-colors"
              >
                <Undo2 className="w-3.5 h-3.5" /> Unsend Message
              </button>
            </div>
          )}

          {/* Chat Bubble / Media rendering */}
          {message.media_url && !message.content ? (
            <div onClick={handleBubbleClick} className="cursor-pointer transition-all active:scale-[0.99] select-none">
              {isVideo ? (
                <div
                  className="relative rounded-2xl overflow-hidden max-w-[240px] xs:max-w-[280px] w-full bg-black shadow-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <video
                    src={message.media_url}
                    controls
                    playsInline
                    className="w-full max-h-60 rounded-2xl"
                  />
                </div>
              ) : (
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowFullMedia(true)
                  }}
                  className="relative cursor-pointer rounded-2xl overflow-hidden group/img max-w-[240px] xs:max-w-[280px] w-full shadow-sm"
                >
                  <img
                    src={message.media_url}
                    alt="Attached Media"
                    className="w-full max-h-60 object-cover transition-transform group-hover/img:scale-[1.03] rounded-2xl"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white rounded-2xl">
                    <Maximize2 className="w-5 h-5 drop-shadow-md" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              onClick={handleBubbleClick}
              className={`px-3.5 py-2 text-[0.8125rem] leading-relaxed break-words space-y-2 cursor-pointer transition-all active:scale-[0.99] select-none ${
                isMine
                  ? 'bg-[#1a73e8] text-white rounded-[1.25rem] rounded-br-[0.375rem] shadow-sm'
                  : 'bg-[#f1f4f8] text-[#1f1f1f] rounded-[1.25rem] rounded-bl-[0.375rem] border border-[#e8eaed]'
              }`}
            >
              {/* Render Video Media (with text) */}
              {message.media_url && isVideo && (
                <div
                  className="relative rounded-xl overflow-hidden max-w-[240px] xs:max-w-[280px] w-full bg-black"
                  onClick={(e) => e.stopPropagation()}
                >
                  <video
                    src={message.media_url}
                    controls
                    playsInline
                    className="w-full max-h-60 rounded-xl"
                  />
                </div>
              )}

              {/* Render Image Media (with text) */}
              {message.media_url && !isVideo && (
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowFullMedia(true)
                  }}
                  className="relative cursor-pointer rounded-xl overflow-hidden group/img max-w-[240px] xs:max-w-[280px] w-full border border-black/10"
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
          )}

          {/* Desktop Hover Action Buttons (react + unsend) */}
          <div className={`hidden sm:flex absolute top-0 ${isMine ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1'} opacity-0 group-hover:opacity-100 transition-opacity items-center gap-0.5`}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowReactionPicker(!showReactionPicker)
                setShowContextMenu(false)
              }}
              className="p-1.5 rounded-full hover:bg-[#f1f4f8] text-[#9aa0a6] hover:text-[#5f6368] transition-colors"
              title="React"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>
            {isMine && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowContextMenu(!showContextMenu)
                  setShowReactionPicker(false)
                }}
                className="p-1.5 rounded-full hover:bg-[#f1f4f8] text-[#9aa0a6] hover:text-[#5f6368] transition-colors"
                title="Unsend"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Reaction Chips & Seen Status */}
        <div className={`flex items-center gap-2 mt-0.5 w-full ${isMine ? 'justify-end' : 'justify-start'}`}>
          {reactionEntries.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {reactionEntries.map(([emoji, reactors]) => {
                const hasReacted = reactors.includes(currentUserId)
                return (
                  <button
                    key={emoji}
                    onClick={(e) => {
                      e.stopPropagation()
                      onReact(message.id, emoji)
                    }}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all active:scale-95 ${
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

          {/* Seen Status for sender's messages */}
          {isMine && (
            <div className="flex items-center gap-1 text-[10px] select-none shrink-0 ml-1">
              {isSeenByRecipient ? (
                <span className="flex items-center gap-0.5 text-[#1a73e8] font-semibold text-[10px]">
                  <CheckCheck className="w-3.5 h-3.5 text-[#1a73e8]" /> Seen
                </span>
              ) : (
                <span className="flex items-center gap-0.5 text-[#9aa0a6] text-[10px]">
                  <Check className="w-3 h-3" /> Sent
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fullsize Image Lightbox */}
      {showFullMedia && message.media_url && !isVideo && (
        <div
          onClick={() => setShowFullMedia(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="relative max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl">
            <button
              onClick={() => setShowFullMedia(false)}
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
