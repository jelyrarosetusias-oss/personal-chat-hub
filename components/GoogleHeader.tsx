'use client'

import React, { useState, useEffect } from 'react'
import { UserProfile } from '@/lib/types'
import { MessageSquare, Shield, LogOut, Edit3, Copy, Check, ChevronDown, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

interface GoogleHeaderProps {
  currentUser: UserProfile
  onOpenProfileModal: () => void
  onSignOut: () => void
  onUserUpdate?: (updated: UserProfile) => void
}

export default function GoogleHeader({
  currentUser,
  onOpenProfileModal,
  onSignOut,
  onUserUpdate
}: GoogleHeaderProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isOnlineState, setIsOnlineState] = useState(currentUser.is_online ?? true)
  const [togglingStatus, setTogglingStatus] = useState(false)

  useEffect(() => {
    setIsOnlineState(currentUser.is_online ?? true)
  }, [currentUser.is_online])

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(currentUser.short_id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleToggleAdminStatus = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!currentUser.is_admin || togglingStatus) return

    const nextOnline = !isOnlineState
    // Instant 0ms visual feedback
    setIsOnlineState(nextOnline)
    setTogglingStatus(true)

    try {
      const res = await fetch('/api/admin/active-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_online: nextOnline })
      })
      const data = await res.json()
      if (res.ok && data.user) {
        if (onUserUpdate) onUserUpdate(data.user)
      } else {
        // Rollback on error
        setIsOnlineState(!nextOnline)
      }
    } catch (err) {
      console.error('Active status toggle error:', err)
      setIsOnlineState(!nextOnline)
    } finally {
      setTogglingStatus(false)
    }
  }

  return (
    <header className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 mb-1.5 sm:mb-3 bg-white/95 backdrop-blur-md rounded-2xl md-card border border-[#e8eaed] shrink-0 relative z-30">
      {/* Brand / Logo */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#1a73e8] to-[#4285f4] text-white flex items-center justify-center shadow-sm shrink-0">
          <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-sm sm:text-base font-mono font-bold text-[#1f1f1f] leading-none tracking-widest truncate select-none">⍙⌖⍜⌰⏃⍀⟟⌇</h1>
            {currentUser.is_admin && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#fef7e0] text-[#b06000] border border-[#fce8b2] shrink-0">
                <Shield className="w-2.5 h-2.5" /> ADMIN
              </span>
            )}
          </div>
          <p className="text-[10px] sm:text-[11px] font-mono text-[#9aa0a6] leading-tight hidden sm:block truncate select-none tracking-wider">⏁⍀⏃⋏⌇⋔⟟⌇⌇⟟⍜⋏</p>
        </div>
      </div>

      {/* User Account Controls */}
      <div className="relative shrink-0">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 pr-2 sm:pr-3 rounded-full hover:bg-[#f1f4f8] border border-[#e8eaed] transition-colors group"
        >
          <div className="relative">
            <img
              src={currentUser.avatar_url}
              alt={currentUser.display_name}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#f1f4f8] object-cover ring-1 ring-[#e8eaed]"
            />
            {isOnlineState ? (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#1e8e3e] ring-2 ring-white" />
            ) : (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#9aa0a6] ring-2 ring-white" />
            )}
          </div>

          <div className="text-left hidden sm:block max-w-[120px]">
            <p className="text-xs font-semibold text-[#1f1f1f] leading-none truncate">{currentUser.display_name}</p>
            <p className="text-[10px] font-mono text-[#1a73e8] leading-none mt-0.5">#{currentUser.short_id}</p>
          </div>

          <ChevronDown className="w-3.5 h-3.5 text-[#5f6368] group-hover:text-[#1f1f1f] transition-transform duration-200" />
        </button>

        {/* User Dropdown Menu */}
        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            
            <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-xl border border-[#e8eaed] p-2 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
              {/* Header Info */}
              <div className="p-3 bg-[#f8fafb] rounded-xl border border-[#e8eaed] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">Your Chat ID</span>
                  <button
                    onClick={handleCopyId}
                    className="flex items-center gap-1 text-[10px] font-semibold text-[#1a73e8] hover:underline"
                  >
                    {copied ? <Check className="w-3 h-3 text-[#1e8e3e]" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="font-mono text-base font-extrabold text-[#1a73e8] tracking-wider">
                  #{currentUser.short_id}
                </div>
                <p className="text-[11px] text-[#5f6368] truncate">@{currentUser.username}</p>
                {currentUser.bio && <p className="text-[10px] text-[#5f6368] italic line-clamp-2">"{currentUser.bio}"</p>}
              </div>

              {/* Admin Active Status Toggle (Admin Only) */}
              {currentUser.is_admin && (
                <button
                  type="button"
                  onClick={handleToggleAdminStatus}
                  disabled={togglingStatus}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer select-none active:scale-[0.98] ${
                    isOnlineState
                      ? 'bg-[#e6f4ea] text-[#137333] hover:bg-[#ceead6] border border-[#ceead6]'
                      : 'bg-[#f1f4f8] text-[#5f6368] hover:bg-[#e8eaed] border border-[#dadce0]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isOnlineState ? (
                      <Eye className="w-4 h-4 text-[#1e8e3e]" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-[#5f6368]" />
                    )}
                    <span>{isOnlineState ? 'Active Status: ON' : 'Active Status: OFF'}</span>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md ${
                    isOnlineState ? 'bg-[#1e8e3e] text-white' : 'bg-[#9aa0a6] text-white'
                  }`}>
                    {isOnlineState ? 'Visible' : 'Hidden'}
                  </span>
                </button>
              )}

              {/* Admin Dashboard link */}
              {currentUser.is_admin && (
                <Link
                  href="/admin"
                  onClick={() => setShowMenu(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#b06000] rounded-xl hover:bg-[#fef7e0] transition-colors"
                >
                  <Shield className="w-4 h-4 text-[#b06000]" />
                  <span>Admin Dashboard</span>
                </Link>
              )}

              {/* Edit Profile */}
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false)
                  onOpenProfileModal()
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#3c4043] rounded-xl hover:bg-[#f1f4f8] transition-colors cursor-pointer"
              >
                <Edit3 className="w-4 h-4 text-[#5f6368]" />
                <span>Edit Profile & Avatar</span>
              </button>

              {/* Sign Out */}
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false)
                  onSignOut()
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#d93025] rounded-xl hover:bg-[#fce8e6] transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-[#d93025]" />
                <span>Sign Out</span>
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
