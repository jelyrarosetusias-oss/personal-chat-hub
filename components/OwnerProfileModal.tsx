'use client'

import React, { useState } from 'react'
import { OwnerProfile, MockStore } from '@/lib/mock-store'
import { User, Check, X, Image as ImageIcon } from 'lucide-react'

interface OwnerProfileModalProps {
  profile: OwnerProfile
  onSave: (updated: OwnerProfile) => void
  onClose: () => void
}

const AVATAR_PRESETS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=owner-alex',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=owner-jordan',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=owner-blue',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=owner-dev',
  'https://api.dicebear.com/7.x/bottts/svg?seed=owner-bot',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=owner-tech'
]

export default function OwnerProfileModal({ profile, onSave, onClose }: OwnerProfileModalProps) {
  const [name, setName] = useState(profile.name)
  const [bio, setBio] = useState(profile.bio)
  const [statusNote, setStatusNote] = useState(profile.statusNote)
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const updated = MockStore.updateOwnerProfile({
      name: name.trim(),
      bio: bio.trim(),
      statusNote: statusNote.trim(),
      avatarUrl: avatarUrl.trim()
    })

    setSavedSuccess(true)
    setTimeout(() => {
      onSave(updated)
      onClose()
    }, 400)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
      <div className="w-full max-w-md md-card p-6 shadow-xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#d3e3fd] text-[#1a73e8] flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-[#1f1f1f] text-base">Edit Profile</h3>
              <p className="text-xs text-[#5f6368]">Update your public details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#f1f4f8] text-[#5f6368] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Picker */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[#3c4043] flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[#1a73e8]" /> Avatar
            </label>
            <div className="grid grid-cols-6 gap-2 p-2.5 rounded-2xl bg-[#f1f4f8] border border-[#e8eaed]">
              {AVATAR_PRESETS.map((preset) => {
                const isSelected = avatarUrl === preset
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAvatarUrl(preset)}
                    className={`relative rounded-xl overflow-hidden p-1 transition-all ${
                      isSelected
                        ? 'ring-2 ring-[#1a73e8] bg-[#d3e3fd] scale-110'
                        : 'opacity-50 hover:opacity-100'
                    }`}
                  >
                    <img src={preset} alt="avatar" className="w-9 h-9 rounded-lg object-cover" />
                    {isSelected && (
                      <div className="absolute top-0 right-0 bg-[#1a73e8] text-white rounded-bl-md p-0.5">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#3c4043]">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Johnson"
              maxLength={30}
              required
              className="w-full px-4 py-2.5 md-input"
            />
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#3c4043]">Short Bio</label>
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. Software Engineer • Freelancer"
              maxLength={60}
              className="w-full px-4 py-2.5 md-input"
            />
          </div>

          {/* Status Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#3c4043]">Header Status Note</label>
            <input
              type="text"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="e.g. No TikTok/FB/IG — DM me here"
              maxLength={60}
              className="w-full px-4 py-2.5 md-input"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e8eaed]">
            <button type="button" onClick={onClose} className="px-4 py-2 md-btn-text text-xs">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2 md-btn-filled text-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              {savedSuccess ? (
                <><Check className="w-3.5 h-3.5" /> Saved!</>
              ) : (
                'Save Profile'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
