'use client'

import React, { useState, useRef } from 'react'
import { UserProfile, Post, DEFAULT_AVATAR } from '@/lib/types'
import { Image as ImageIcon, X, Send, Loader2, Sparkles } from 'lucide-react'

interface CreatePostBoxProps {
  currentUser: UserProfile
  onPostCreated: (post: Post) => void
}

export default function CreatePostBox({ currentUser, onPostCreated }: CreatePostBoxProps) {
  const [content, setContent] = useState('')
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [posting, setPosting] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)

    try {
      let fileToUpload = file
      // Client-side image compression
      try {
        const imageCompression = (await import('browser-image-compression')).default
        fileToUpload = await imageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1600,
          useWebWorker: true
        })
      } catch (cErr) {
        console.warn('Image compression fallback:', cErr)
      }

      const formData = new FormData()
      formData.append('file', fileToUpload)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()

      if (res.ok && data.url) {
        setMediaUrl(data.url)
      } else {
        setUploadError(data.error || 'Failed to upload photo')
      }
    } catch (err: any) {
      console.error('Image upload error:', err)
      setUploadError('Network error uploading photo')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() && !mediaUrl) return
    setPosting(true)
    setUploadError(null)

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim() || null,
          media_url: mediaUrl,
          media_type: 'image'
        })
      })
      const data = await res.json()

      if (res.ok && data.post) {
        onPostCreated(data.post)
        setContent('')
        setMediaUrl(null)
      } else {
        setUploadError(data.error || 'Failed to publish post')
      }
    } catch (err: any) {
      setUploadError(err.message || 'Error publishing post')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl md-card border border-[#e8eaed] p-3.5 sm:p-4 space-y-3 shadow-xs">
      {/* Header with Avatar & Input */}
      <div className="flex items-start gap-3">
        <img
          src={currentUser.avatar_url || DEFAULT_AVATAR}
          alt={currentUser.display_name}
          className="w-10 h-10 rounded-full bg-[#f1f4f8] object-cover ring-1 ring-[#e8eaed] shrink-0"
        />
        <div className="flex-1 min-w-0">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`What's on your mind, ${currentUser.display_name}?`}
            rows={content ? 3 : 2}
            className="w-full text-xs sm:text-sm text-[#1f1f1f] placeholder-[#9aa0a6] bg-transparent outline-none resize-none"
          />
        </div>
      </div>

      {/* Upload error banner */}
      {uploadError && (
        <div className="p-2 rounded-xl bg-[#fce8e6] text-[#d93025] text-xs font-medium flex items-center justify-between">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="p-0.5 hover:bg-black/10 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Uploading progress indicator */}
      {uploading && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#e8f0fe] text-[#1a73e8] text-xs font-medium animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Processing and uploading image...</span>
        </div>
      )}

      {/* Attached Image Preview */}
      {mediaUrl && (
        <div className="relative rounded-2xl overflow-hidden border border-[#e8eaed] bg-black/5 max-h-72 flex items-center justify-center group">
          <img src={mediaUrl} alt="Post preview" className="w-full max-h-72 object-cover" />
          <button
            type="button"
            onClick={() => setMediaUrl(null)}
            className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors shadow-md"
            title="Remove photo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Footer Controls & Submit */}
      <div className="flex items-center justify-between pt-2 border-t border-[#f1f4f8]">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-[#f1f4f8] text-[#5f6368] hover:text-[#1a73e8] text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <ImageIcon className="w-4 h-4 text-[#1e8e3e]" />
          <span>Add Photo</span>
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={posting || uploading || (!content.trim() && !mediaUrl)}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] active:scale-95 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-40 disabled:hover:bg-[#1a73e8]"
        >
          {posting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span>Post</span>
        </button>
      </div>
    </div>
  )
}
