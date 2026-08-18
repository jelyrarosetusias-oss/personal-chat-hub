'use client'

import React, { useState } from 'react'
import { User, Sparkles, Check, RefreshCw } from 'lucide-react'

interface ProfileModalProps {
  inviteCode: string
  onSubmit: (username: string, avatarUrl: string) => void
}

const AVATAR_SEEDS = ['CyberSurfer', 'PixelWizard', 'AlphaShadow', 'MatrixGhost', 'VortexCore', 'NeonPhoenix']

export default function ProfileModal({ inviteCode, onSubmit }: ProfileModalProps) {
  const [username, setUsername] = useState('')
  const [selectedSeed, setSelectedSeed] = useState(AVATAR_SEEDS[0])

  const getAvatarUrl = (seed: string) => `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return
    onSubmit(username.trim(), getAvatarUrl(selectedSeed))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl relative glow-box-purple">
        <div className="text-center space-y-3 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-mono font-medium">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" /> Key Authenticated: {inviteCode}
          </div>
          <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            Create Identity <Sparkles className="w-5 h-5 text-purple-400" />
          </h2>
          <p className="text-sm text-slate-400">
            Choose your encrypted alias and avatar for this private session.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider block">
              Choose Avatar
            </label>
            <div className="grid grid-cols-6 gap-2 p-3 rounded-2xl bg-white/5 border border-white/10">
              {AVATAR_SEEDS.map((seed) => {
                const url = getAvatarUrl(seed)
                const isSelected = selectedSeed === seed
                return (
                  <button
                    key={seed}
                    type="button"
                    onClick={() => setSelectedSeed(seed)}
                    className={`relative rounded-xl overflow-hidden p-1 transition-all ${
                      isSelected
                        ? 'ring-2 ring-purple-500 bg-purple-500/20 scale-105'
                        : 'opacity-60 hover:opacity-100 hover:bg-white/10'
                    }`}
                  >
                    <img src={url} alt={seed} className="w-10 h-10 rounded-lg object-cover" />
                    {isSelected && (
                      <div className="absolute top-0 right-0 bg-purple-600 rounded-bl-md p-0.5 text-white">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Username Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-purple-300 uppercase tracking-wider block">
              Display Name / Alias
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Alex, NeonSurfer..."
                maxLength={24}
                className="w-full px-4 py-3.5 rounded-xl glass-input text-white font-medium placeholder:text-slate-600"
                required
                autoFocus
              />
              <User className="absolute right-3.5 top-3.5 w-5 h-5 text-slate-500" />
            </div>
          </div>

          <button
            type="submit"
            disabled={!username.trim()}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-purple-900/40 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Enter Encrypted Room
          </button>
        </form>
      </div>
    </div>
  )
}
