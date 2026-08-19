'use client'

import React, { useState, useRef } from 'react'
import { Send, Smile, Paperclip, X, Video, Image as ImageIcon, Loader2 } from 'lucide-react'

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
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value)
    if (onTyping) onTyping()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (uploading) return
    if (!text.trim() && !mediaUrl) return

    onSendMessage(text.trim(), mediaUrl || undefined, mediaUrl ? mediaType : undefined)
    setText('')
    setMediaUrl(null)
    setShowEmojis(false)
    setUploadError(null)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isVideo = file.type.startsWith('video/')
    setMediaType(isVideo ? 'video' : 'image')
    setUploading(true)
    setUploadError(null)

    // Check size limit: 30MB
    if (file.size > 30 * 1024 * 1024) {
      setUploadError('File is too large (max 30MB). Please choose a smaller video/photo.')
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    try {
      let fileToUpload = file

      // If image, compress client-side first
      if (!isVideo) {
        try {
          const imageCompression = (await import('browser-image-compression')).default
          fileToUpload = await imageCompression(file, {
            maxSizeMB: 0.3,
            maxWidthOrHeight: 1280,
            useWebWorker: true
          })
        } catch (compErr) {
          console.warn('Image compression fallback:', compErr)
        }
      }

      // Upload via /api/upload
      const formData = new FormData()
      formData.append('file', fileToUpload)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()

      if (res.ok && data.url) {
        setMediaUrl(data.url)
        setMediaType(data.type || (isVideo ? 'video' : 'image'))
      } else {
        setUploadError(data.error || 'Failed to upload media')
      }
    } catch (err: any) {
      console.error('File upload error:', err)
      setUploadError('Network error uploading media')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const insertEmoji = (emoji: string) => {
    setText((prev) => prev + emoji)
    if (onTyping) onTyping()
  }

  return (
    <div className="relative w-full space-y-2">
      {/* Upload Error Banner */}
      {uploadError && (
        <div className="p-2 rounded-xl bg-[#fce8e6] text-[#d93025] text-xs font-medium flex items-center justify-between animate-fade-in">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="p-0.5 hover:bg-black/10 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Uploading Status Indicator */}
      {uploading && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#e8f0fe] text-[#1a73e8] text-xs font-medium w-fit animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Processing & uploading {mediaType}...</span>
        </div>
      )}

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
          <div className="text-xs space-y-0.5">
            <p className="font-semibold text-[#1f1f1f] capitalize">{mediaType} attached</p>
            <p className="text-[10px] text-[#5f6368]">Ready to send</p>
          </div>
          <button
            type="button"
            onClick={() => setMediaUrl(null)}
            className="p-1 rounded-full hover:bg-[#dadce0] text-[#5f6368] transition-colors ml-2"
            title="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojis && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowEmojis(false)} />
          <div className="absolute bottom-full mb-2 left-0 w-72 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-[#e8eaed] p-3 z-40 animate-in fade-in zoom-in-95 duration-150 space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-[#f1f4f8]">
              <span className="text-xs font-bold text-[#1f1f1f]">Emoji</span>
              <button
                type="button"
                onClick={() => setShowEmojis(false)}
                className="p-1 hover:bg-[#f1f4f8] rounded-full text-[#5f6368]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {EMOJI_CATEGORIES.map((cat) => (
                <div key={cat.name} className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#9aa0a6] tracking-wider">
                    {cat.name}
                  </span>
                  <div className="grid grid-cols-8 gap-1">
                    {cat.emojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => insertEmoji(emoji)}
                        className="text-base hover:bg-[#f1f4f8] p-1 rounded-lg transition-transform active:scale-125"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Main Composer Bar */}
      <form onSubmit={handleSubmit} className="flex items-center gap-1.5 sm:gap-2">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Media / Attachment Button */}
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="p-2 sm:p-2.5 rounded-full hover:bg-[#f1f4f8] text-[#5f6368] hover:text-[#1a73e8] transition-colors shrink-0 disabled:opacity-50"
          title="Attach photo or video"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Emoji Trigger */}
        <button
          type="button"
          onClick={() => setShowEmojis(!showEmojis)}
          className="p-2 sm:p-2.5 rounded-full hover:bg-[#f1f4f8] text-[#5f6368] hover:text-[#1a73e8] transition-colors shrink-0"
          title="Insert emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Message Text Input */}
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={text}
            onChange={handleInputChange}
            placeholder={placeholder || 'Type a message...'}
            className="w-full px-4 py-2 sm:py-2.5 rounded-full bg-[#f1f4f8] border border-transparent focus:border-[#1a73e8] focus:bg-white focus:ring-2 focus:ring-[#1a73e8]/20 outline-none text-xs sm:text-sm text-[#1f1f1f] placeholder-[#9aa0a6] transition-all"
          />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={uploading || (!text.trim() && !mediaUrl)}
          className="p-2 sm:p-2.5 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] active:scale-95 text-white transition-all shadow-xs disabled:opacity-40 disabled:hover:bg-[#1a73e8] shrink-0"
          title="Send message"
        >
          <Send className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </form>
    </div>
  )
}
