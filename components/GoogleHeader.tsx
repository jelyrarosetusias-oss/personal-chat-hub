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
    <header className="w-full p-3.5 sm:px-5 sm:py-4 md-card mb-2 sm:mb-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        {/* Avatar */}
        <div className="relative shrink-0">
          <img
            src={ownerAvatarUrl}
            alt={ownerName}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover ring-2 ring-[#d3e3fd]"
          />
          <span
            className={`absolute bottom-0 right-0 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border-[2.5px] border-white ${
              isOnline ? 'bg-[#1e8e3e] online-pulse' : 'bg-[#9aa0a6]'
            }`}
          />
        </div>

        {/* Identity */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-semibold text-[#1f1f1f] tracking-tight leading-tight truncate">
              {ownerName}
            </h1>
            <span className="md-chip-primary md-chip text-[10px] sm:text-xs py-0.5 px-2">Personal DM</span>
          </div>

          {ownerBio && (
            <p className="text-[11px] sm:text-xs text-[#5f6368] mt-0.5 truncate max-w-[280px] sm:max-w-md">{ownerBio}</p>
          )}

          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-[#5f6368] mt-0.5">
            <span className={`font-medium flex items-center gap-1.5 shrink-0 ${isOnline ? 'text-[#1e8e3e]' : 'text-[#9aa0a6]'}`}>
              <span className={`w-[6px] h-[6px] rounded-full ${isOnline ? 'bg-[#1e8e3e]' : 'bg-[#9aa0a6]'}`} />
              {statusText}
            </span>
            {statusNote && (
              <>
                <span className="text-[#dadce0]">|</span>
                <span className="truncate max-w-[140px] sm:max-w-[240px]">{statusNote}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 ml-auto sm:ml-0">
        {isOwnerMode && onOpenProfileModal && (
          <button
            onClick={onOpenProfileModal}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 md-btn-tonal text-[11px] sm:text-xs"
          >
            <Settings className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            Edit Profile
          </button>
        )}

        <button
          onClick={onToggleOwnerModal}
          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-medium rounded-full transition-all ${
            isOwnerMode
              ? 'md-chip-success'
              : 'md-btn-text'
          }`}
        >
          {isOwnerMode ? (
            <>
              <UserCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              Owner Mode
            </>
          ) : (
            <>
              <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              Owner Login
            </>
          )}
        </button>
      </div>
    </header>
  )
}
