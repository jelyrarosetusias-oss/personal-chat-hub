'use client'

import React from 'react'
import { ShieldCheck, LogOut, Users, Lock } from 'lucide-react'

interface PresenceHeaderProps {
  username: string
  avatarUrl: string
  inviteCode: string
  onlineCount: number
  onSignOut: () => void
  isDemo?: boolean
}

export default function PresenceHeader({
  username,
  avatarUrl,
  inviteCode,
  onlineCount,
  onSignOut,
  isDemo
}: PresenceHeaderProps) {
  return (
    <header className="px-6 py-4 glass-panel rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-4 shadow-xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
          <Lock className="w-5 h-5 glow-text-purple" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-white tracking-wide text-base"># cipher-lounge</h2>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-mono">
              Key: {inviteCode}
            </span>
            {isDemo && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-mono">
                Demo Mode
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
              {onlineCount} {onlineCount === 1 ? 'member' : 'members'} online
            </span>
            <span>•</span>
            <span className="text-slate-400">End-to-End Sessions</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
          <img src={avatarUrl} alt={username} className="w-6 h-6 rounded-md object-cover" />
          <span className="text-xs font-semibold text-slate-200">{username}</span>
        </div>

        <button
          onClick={onSignOut}
          title="Sign Out"
          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 transition-colors flex items-center justify-center"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
