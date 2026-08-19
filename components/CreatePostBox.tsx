'use client'

import React, { useState, useRef } from 'react'
import { UserProfile, Post, DEFAULT_AVATAR } from '@/lib/types'
import { Image as ImageIcon, X, Send, Loader2, Plus } from 'lucide-react'

interface CreatePostBoxProps {
  currentUser: UserProfile
  onPostCreated: (post: Post) => void
}

export default function CreatePostBox({ currentUser, onPostCreated }: CreatePostBoxProps) {
  const [content, setContent] = useState('')
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [posting, setPosting] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setUploadError(null)

    try {
      const imageCompression = (await import('browser-image-compression')).default
      const newUrls: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        let fileToUpload = file

        try {
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
          newUrls.push(data.url)
        } else {
          setUploadError(data.error || 'Failed to upload photo')
        }
      }

      if (newUrls.length > 0) {
        setMediaUrls((prev) => [...prev, ...newUrls])
      }
    } catch (err: any) {
      console.error('Image upload error:', err)
      setUploadError('Network error uploading photos')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveImage = (indexToRemove: number) => {
    setMediaUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() && mediaUrls.length === 0) return
    setPosting(true)
    setUploadError(null)

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim() || null,
          media_urls: mediaUrls,
          media_url: mediaUrls[0] || null,
          media_type: mediaUrls.length > 0 ? 'image' : null
        })
      })
      const data = await res.json()

      if (res.ok && data.post) {
        onPostCreated(data.post)
        setContent('')
        setMediaUrls([])
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
            rows={content || mediaUrls.length > 0 ? 3 : 2}
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
          <span>Processing and uploading photos...</span>
        </div>
      )}

      {/* Attached Images Grid Preview */}
      {mediaUrls.length > 0 && (
        <div className={`grid gap-2 rounded-2xl overflow-hidden ${
          mediaUrls.length === 1 ? 'grid-cols-1' : mediaUrls.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
        }`}>
          {mediaUrls.map((url, idx) => (
            <div key={idx} className="relative group rounded-xl overflow-hidden border border-[#e8eaed] bg-black/5 aspect-video sm:aspect-square flex items-center justify-center">
              <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemoveImage(idx)}
                className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors shadow-md"
                title="Remove image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {/* Add more button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border-2 border-dashed border-[#dadce0] hover:border-[#1a73e8] bg-[#f8fafb] hover:bg-[#e8f0fe]/30 flex flex-col items-center justify-center gap-1 text-[#5f6368] hover:text-[#1a73e8] text-xs font-semibold aspect-video sm:aspect-square transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add more</span>
          </button>
        </div>
      )}

      {/* Footer Controls & Submit */}
      <div className="flex items-center justify-between pt-2 border-t border-[#f1f4f8]">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
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
          <span>{mediaUrls.length > 0 ? `Add Photos (${mediaUrls.length})` : 'Add Photos'}</span>
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={posting || uploading || (!content.trim() && mediaUrls.length === 0)}
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
