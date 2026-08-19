'use client'

import React, { useState, useRef } from 'react'
import { UserProfile, DEFAULT_AVATAR } from '@/lib/types'
import { MessageSquare, Upload, Copy, Check, ArrowRight, UserCheck, Camera, Eye, EyeOff } from 'lucide-react'

interface AuthScreenProps {
  onAuthSuccess: (user: UserProfile) => void
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  
  // Login State
  const [loginIdentifier, setLoginIdentifier] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  
  // Signup State
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [customAvatar, setCustomAvatar] = useState<string | null>(null)
  
  // UI State
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdUser, setCreatedUser] = useState<UserProfile | null>(null)
  const [copied, setCopied] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const imageCompression = (await import('browser-image-compression')).default
        const compressed = await imageCompression(file, { maxSizeMB: 0.15, maxWidthOrHeight: 500, useWebWorker: true })
        const reader = new FileReader()
        reader.onload = (event) => {
          if (event.target?.result) setCustomAvatar(event.target.result as string)
        }
        reader.readAsDataURL(compressed)
      } catch {
        const reader = new FileReader()
        reader.onload = (event) => {
          if (event.target?.result) setCustomAvatar(event.target.result as string)
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginIdentifier || !loginPassword) return
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: loginIdentifier, password: loginPassword })
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to sign in')
        setLoading(false)
        return
      }

      onAuthSuccess(data.user)
    } catch (err: any) {
      setError(err.message || 'Network error')
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName || !username || !signupPassword) return
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName,
          username,
          password: signupPassword,
          avatar_url: customAvatar || DEFAULT_AVATAR
        })
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to create account')
        setLoading(false)
        return
      }

      setCreatedUser(data.user)
      setLoading(false)
    } catch (err: any) {
      setError(err.message || 'Network error')
      setLoading(false)
    }
  }

  const handleCopyShortId = () => {
    if (!createdUser?.short_id) return
    navigator.clipboard.writeText(createdUser.short_id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // If user just signed up, show Welcome & Short ID Screen
  if (createdUser) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-3 sm:p-4 bg-gradient-to-br from-[#f8fafb] via-[#eef2f6] to-[#e3ecfc]">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#e8eaed] text-center space-y-5 sm:space-y-6 animate-in fade-in zoom-in-95 duration-200 my-auto max-h-[95dvh] overflow-y-auto">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full mx-auto p-1 bg-gradient-to-tr from-[#1a73e8] to-[#34a853] shadow-md">
            <img src={createdUser.avatar_url} alt={createdUser.display_name} className="w-full h-full rounded-full bg-white object-cover" />
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#e6f4ea] text-[#137333] mb-2">
              <UserCheck className="w-3.5 h-3.5" /> Account Created!
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1f1f1f]">Welcome, {createdUser.display_name}!</h2>
            <p className="text-xs text-[#5f6368] mt-1">Here is your unique 6-character Short ID. Share it with friends so they can find and message you!</p>
          </div>

          {/* Short ID Card */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#f1f4f8] border border-[#dadce0] flex items-center justify-between">
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-wider font-bold text-[#5f6368]">Your Chat ID</p>
              <p className="text-xl sm:text-2xl font-mono font-extrabold text-[#1a73e8] tracking-widest">#{createdUser.short_id}</p>
            </div>
            <button
              onClick={handleCopyShortId}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#dadce0] text-xs font-semibold text-[#1a73e8] hover:bg-[#e8f0fe] active:scale-95 transition-all shadow-sm"
            >
              {copied ? <Check className="w-4 h-4 text-[#1e8e3e]" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy ID'}
            </button>
          </div>

          <button
            onClick={() => onAuthSuccess(createdUser)}
            className="w-full py-3.5 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] active:scale-[0.99] text-white font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2"
          >
            <span className="font-mono tracking-wider">⟒⋏⏁⟒⍀</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-3 sm:p-4 bg-gradient-to-br from-[#f8fafb] via-[#eef2f6] to-[#e3ecfc]">
      <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-8 shadow-xl border border-[#e8eaed] space-y-5 sm:space-y-6 animate-in fade-in duration-200 my-auto max-h-[95dvh] overflow-y-auto">
        
        {/* App Logo & Header */}
        <div className="text-center space-y-1.5 sm:space-y-2">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-[#1a73e8] to-[#4285f4] text-white flex items-center justify-center mx-auto shadow-md">
            <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-mono font-bold text-[#1f1f1f] tracking-widest select-none">⍙⌖⍜⌰⏃⍀⟟⌇</h1>
          <p className="text-xs font-mono text-[#9aa0a6] select-none tracking-widest">⌿⍀⍜⏁⍜☊⍜⌰ • ⏁⍀⏃⋏⌇⋔⟟⌇⌇⟟⍜⋏</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-[#f1f4f8] rounded-2xl">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(null) }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === 'login' ? 'bg-white text-[#1a73e8] shadow-sm' : 'text-[#5f6368] hover:text-[#1f1f1f]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('signup'); setError(null) }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === 'signup' ? 'bg-white text-[#1a73e8] shadow-sm' : 'text-[#5f6368] hover:text-[#1f1f1f]'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-[#fce8e6] border border-[#f5c2c7] text-[#d93025] text-xs font-medium text-center">
            {error}
          </div>
        )}

        {/* LOGIN FORM */}
        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#3c4043]">Username or Short ID</label>
              <input
                type="text"
                placeholder="e.g. darskie or #A7K2M9"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#dadce0] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 outline-none text-sm text-[#1f1f1f] bg-[#f8fafb] focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#3c4043]">Password</label>
              <div className="relative">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[#dadce0] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 outline-none text-sm text-[#1f1f1f] bg-[#f8fafb] focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa0a6] hover:text-[#5f6368] transition-colors p-1"
                  title={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !loginIdentifier || !loginPassword}
              className="w-full py-3 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] active:scale-[0.99] text-white font-semibold text-sm transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        ) : (
          /* SIGNUP FORM */
          <form onSubmit={handleSignup} className="space-y-4">
            {/* Optional Avatar Upload with Default Silhouette */}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#f8fafb] border border-[#e8eaed]">
              <div className="relative">
                <img
                  src={customAvatar || DEFAULT_AVATAR}
                  alt="Profile"
                  className="w-12 h-12 rounded-full bg-[#f1f4f8] object-cover ring-2 ring-[#e8eaed] shrink-0"
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 p-1 bg-[#1a73e8] text-white rounded-full hover:bg-[#1557b0] shadow-sm transition-transform active:scale-95"
                  title="Upload profile picture"
                >
                  <Camera className="w-3 h-3" />
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#1f1f1f]">Profile Picture</p>
                <p className="text-[10px] text-[#5f6368]">
                  {customAvatar ? 'Custom photo chosen' : 'Default photo (Optional upload)'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="px-2.5 py-1.5 rounded-xl bg-white border border-[#dadce0] hover:bg-[#f1f4f8] text-[#1a73e8] text-xs font-semibold flex items-center gap-1 transition-colors shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#3c4043]">Display Name</label>
              <input
                type="text"
                placeholder="e.g. Sarah Miller"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#dadce0] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 outline-none text-sm text-[#1f1f1f] bg-[#f8fafb] focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#3c4043]">Username</label>
              <input
                type="text"
                placeholder="e.g. sarahm"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#dadce0] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 outline-none text-sm text-[#1f1f1f] bg-[#f8fafb] focus:bg-white transition-all"
              />
              <p className="text-[10px] text-[#9aa0a6]">Only lowercase letters, numbers, and underscores</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#3c4043]">Password</label>
              <div className="relative">
                <input
                  type={showSignupPassword ? 'text' : 'password'}
                  placeholder="At least 4 characters"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  required
                  minLength={4}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[#dadce0] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 outline-none text-sm text-[#1f1f1f] bg-[#f8fafb] focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa0a6] hover:text-[#5f6368] transition-colors p-1"
                  title={showSignupPassword ? 'Hide password' : 'Show password'}
                >
                  {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !displayName || !username || !signupPassword}
              className="w-full py-3 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] active:scale-[0.99] text-white font-semibold text-sm transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Create Account & Get ID'
              )}
            </button>
          </form>
        )}

        <div className="text-center text-[10px] text-[#9aa0a6]">
          Direct Messaging • Real-time Sync • Material Design
        </div>
      </div>
    </div>
  )
}
