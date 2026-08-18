'use client'

import React from 'react'
import { UserCheck, Lock, Settings } from 'lucide-react'
import { formatLastActive } from '@/lib/mock-store'

interface GoogleHeaderProps {
  ownerName: string
  ownerBio?: string
  ownerAvatarUrl: string
  statusNote?: string
  isOnline: boolean
  lastActiveAt: string
  isOwnerMode: boolean
  onToggleOwnerModal: () => void
  onOpenProfileModal?: () => void
}

export default function GoogleHeader({
  ownerName,
  ownerBio,
  ownerAvatarUrl,
  statusNote,
  isOnline,
  lastActiveAt,
  isOwnerMode,
  onToggleOwnerModal,
  onOpenProfileModal,
}: GoogleHeaderProps) {
  const statusText = formatLastActive(lastActiveAt, isOnline)

  return (
    <header className="w-full px-5 py-4 md-card mb-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative">
          <img
            src={ownerAvatarUrl}
            alt={ownerName}
            className="w-12 h-12 rounded-full object-cover ring-2 ring-[#d3e3fd]"
          />
          <span
            className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-[2.5px] border-white ${
              isOnline ? 'bg-[#1e8e3e] online-pulse' : 'bg-[#9aa0a6]'
            }`}
          />
        </div>

        {/* Identity */}
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold text-[#1f1f1f] tracking-tight leading-tight">
              {ownerName}
            </h1>
            <span className="md-chip-primary md-chip">Personal DM</span>
          </div>

          {ownerBio && (
            <p className="text-xs text-[#5f6368] mt-0.5">{ownerBio}</p>
          )}

          <div className="flex items-center gap-2 text-xs text-[#5f6368] mt-1">
            <span className={`font-medium flex items-center gap-1.5 ${isOnline ? 'text-[#1e8e3e]' : 'text-[#9aa0a6]'}`}>
              <span className={`w-[7px] h-[7px] rounded-full ${isOnline ? 'bg-[#1e8e3e]' : 'bg-[#9aa0a6]'}`} />
              {statusText}
            </span>
            {statusNote && (
              <>
                <span className="text-[#dadce0]">|</span>
                <span className="truncate max-w-[240px]">{statusNote}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {isOwnerMode && onOpenProfileModal && (
          <button
            onClick={onOpenProfileModal}
            className="flex items-center gap-1.5 px-3.5 py-2 md-btn-tonal text-xs"
          >
            <Settings className="w-3.5 h-3.5" />
            Edit Profile
          </button>
        )}

        <button
          onClick={onToggleOwnerModal}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-full transition-all ${
            isOwnerMode
              ? 'md-chip-success'
              : 'md-btn-text'
          }`}
        >
          {isOwnerMode ? (
            <>
              <UserCheck className="w-3.5 h-3.5" />
              Owner Mode
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5" />
              Owner Login
            </>
          )}
        </button>
      </div>
    </header>
  )
}
