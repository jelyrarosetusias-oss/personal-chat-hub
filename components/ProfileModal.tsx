'use client'

import React, { useState, useRef } from 'react'
import { UserProfile, DEFAULT_AVATAR } from '@/lib/types'
import { X, Upload, Trash2, Camera } from 'lucide-react'

interface ProfileModalProps {
  user: UserProfile
  onSave: (updated: UserProfile) => void
  onClose: () => void
}

export default function ProfileModal({ user, onSave, onClose }: ProfileModalProps) {
  const [displayName, setDisplayName] = useState(user.display_name)
  const [bio, setBio] = useState(user.bio || '')
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || DEFAULT_AVATAR)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const imageCompression = (await import('browser-image-compression')).default
        const compressed = await imageCompression(file, { maxSizeMB: 0.15, maxWidthOrHeight: 500, useWebWorker: true })
        const reader = new FileReader()
        reader.onload = (event) => {
          if (event.target?.result) setAvatarUrl(event.target.result as string)
        }
        reader.readAsDataURL(compressed)
      } catch {
        const reader = new FileReader()
        reader.onload = (event) => {
          if (event.target?.result) setAvatarUrl(event.target.result as string)
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) return
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim(),
          bio: bio.trim(),
          avatar_url: avatarUrl
        })
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to update profile')
        setLoading(false)
        return
      }

      onSave(data.user)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Network error')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-[#e8eaed] space-y-4 sm:space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#1f1f1f]">Edit Profile</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#f1f4f8] text-[#5f6368] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-[#fce8e6] border border-[#f5c2c7] text-[#d93025] text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar customizer */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />

          <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#f8fafb] border border-[#e8eaed]">
            <div className="relative shrink-0">
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-14 h-14 rounded-full bg-[#f1f4f8] object-cover ring-2 ring-[#1a73e8]/30"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-1 bg-[#1a73e8] text-white rounded-full hover:bg-[#1557b0] shadow-sm transition-transform active:scale-95"
                title="Change photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#1f1f1f]">Profile Photo</p>
              <p className="text-[10px] text-[#5f6368]">Upload custom image or use default</p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-xl bg-white border border-[#dadce0] hover:bg-[#f1f4f8] text-[#1a73e8] text-xs flex items-center gap-1 font-medium transition-colors"
                title="Upload Photo"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Upload</span>
              </button>

              {avatarUrl !== DEFAULT_AVATAR && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl(DEFAULT_AVATAR)}
                  className="p-2 rounded-xl bg-white border border-[#dadce0] hover:bg-[#fce8e6] text-[#d93025] text-xs font-medium transition-colors"
                  title="Reset to default"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#3c4043]">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#dadce0] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 outline-none text-sm text-[#1f1f1f]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#3c4043]">Bio / Status Note</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              placeholder="e.g. Working on cool web apps..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#dadce0] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 outline-none text-sm text-[#1f1f1f] resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#5f6368] hover:bg-[#f1f4f8] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !displayName.trim()}
              className="px-5 py-2 text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
