'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Smile, Paperclip, X, Video, Image as ImageIcon } from 'lucide-react'

interface MessageInputProps {
  onSendMessage: (text: string, mediaUrl?: string, mediaType?: 'image' | 'video') => void
  onTyping?: () => void
  placeholder?: string
}

const EMOJI_CATEGORIES = [
  { name: 'Smilies', emojis: ['😀', '😂', '😍', '😊', '😎', '🤔', '🙌', '🎉'] },
  { name: 'Gestures', emojis: ['👍', '👋', '🙏', '👏', '🤝', '💪', '🔥', '✨'] },
  { name: 'Hearts & Icons', emojis: ['❤️', '💖', '💯', '🚀', '🔒', '👀', '⭐', '🎈'] }
]

export default function MessageInput({ onSendMessage, onTyping, placeholder }: MessageInputProps) {
  const [text, setText] = useState('')
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image')
  const [showEmojis, setShowEmojis] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value)
    if (onTyping) onTyping()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() && !mediaUrl) return

    onSendMessage(text.trim(), mediaUrl || undefined, mediaUrl ? mediaType : undefined)
    setText('')
    setMediaUrl(null)
    setShowEmojis(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const isVideo = file.type.startsWith('video/')
      setMediaType(isVideo ? 'video' : 'image')

      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setMediaUrl(event.target.result as string)
        }
      }
      reader.readAsDataURL(file)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const insertEmoji = (emoji: string) => {
    setText((prev) => prev + emoji)
    if (onTyping) onTyping()
  }

  return (
    <div className="relative w-full space-y-2">
      {/* Attached Media Preview Bar */}
      {mediaUrl && (
        <div className="flex items-center gap-2.5 p-2 rounded-2xl bg-[#f1f4f8] border border-[#e8eaed] w-fit animate-fade-in">
          <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-[#dadce0] bg-black flex items-center justify-center shrink-0">
            {mediaType === 'video' ? (
              <video src={mediaUrl} className="w-full h-full object-cover" />
            ) : (
              <img src={mediaUrl} alt="Attachment" className="w-full h-full object-cover" />
            )}
            {mediaType === 'video' && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white">
                <Video className="w-4 h-4" />
              </div>
            )}
          </div>
          <div className="pr-2">
            <p className="text-xs font-medium text-[#1f1f1f] flex items-center gap-1">
              {mediaType === 'video' ? <Video className="w-3.5 h-3.5 text-[#1a73e8]" /> : <ImageIcon className="w-3.5 h-3.5 text-[#1a73e8]" />}
              {mediaType === 'video' ? 'Video Attached' : 'Photo Attached'}
            </p>
            <p className="text-[10px] text-[#5f6368]">Ready to send</p>
          </div>
          <button
            type="button"
            onClick={() => setMediaUrl(null)}
            className="p-1 rounded-full hover:bg-[#e8eaed] text-[#5f6368] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojis && (
        <div className="absolute bottom-full mb-2.5 left-0 p-3 md-card w-72 shadow-xl z-20 space-y-2.5">
          <div className="flex items-center justify-between border-b border-[#e8eaed] pb-1.5">
            <span className="text-xs font-semibold text-[#1f1f1f]">Emoji Keyboard</span>
            <button onClick={() => setShowEmojis(false)} className="text-[#9aa0a6] hover:text-[#5f6368]">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {EMOJI_CATEGORIES.map((cat) => (
            <div key={cat.name} className="space-y-1">
              <span className="text-[10px] font-medium text-[#5f6368] uppercase tracking-wider block">
                {cat.name}
              </span>
              <div className="grid grid-cols-8 gap-1">
                {cat.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="w-7 h-7 rounded-lg hover:bg-[#f1f4f8] flex items-center justify-center text-base transition-transform hover:scale-110"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Composer */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Attach Photo or Video"
          className="p-2.5 rounded-full hover:bg-[#f1f4f8] text-[#5f6368] hover:text-[#1a73e8] transition-colors"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <div className="relative flex-1">
          <input
            type="text"
            value={text}
            onChange={handleInputChange}
            placeholder={placeholder || 'Send a message, photo, or video...'}
            maxLength={1000}
            className="w-full px-5 py-3 pl-11 md-input text-xs sm:text-sm"
          />
          <button
            type="button"
            onClick={() => setShowEmojis(!showEmojis)}
            className="absolute left-3.5 top-3 text-[#9aa0a6] hover:text-[#1a73e8] transition-colors"
          >
            <Smile className="w-5 h-5" />
          </button>
        </div>

        <button
          type="submit"
          disabled={!text.trim() && !mediaUrl}
          className="p-3 md-btn-filled disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
        >
          <Send className="w-[18px] h-[18px]" />
        </button>
      </form>
    </div>
  )
}
