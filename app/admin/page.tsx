'use client'

import React, { useState, useEffect } from 'react'
import { UserProfile } from '@/lib/types'
import {
  Shield,
  Users,
  MessageSquare,
  ArrowLeft,
  Search,
  Ban,
  CheckCircle,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'users' | 'messages'>('users')

  // Active status toggle state
  const [isOnlineState, setIsOnlineState] = useState(true)
  const [togglingStatus, setTogglingStatus] = useState(false)

  // Users State
  const [users, setUsers] = useState<any[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [togglingBanId, setTogglingBanId] = useState<string | null>(null)

  // Messages State
  const [messages, setMessages] = useState<any[]>([])
  const [deletingMsgId, setDeletingMsgId] = useState<string | null>(null)

  // 1. Verify admin session
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await fetch('/api/auth/session')
        const data = await res.json()
        if (!data.user || !data.user.is_admin) {
          router.push('/')
          return
        }
        setCurrentUser(data.user)
        setIsOnlineState(data.user.is_online ?? true)
        fetchUsers()
        fetchMessages()
      } catch {
        router.push('/')
      } finally {
        setLoading(false)
      }
    }
    checkAdmin()
  }, [router])

  const handleToggleAdminStatus = async () => {
    if (!currentUser?.is_admin || togglingStatus) return
    const nextOnline = !isOnlineState
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
        setCurrentUser(data.user)
      } else {
        setIsOnlineState(!nextOnline)
      }
    } catch {
      setIsOnlineState(!nextOnline)
    } finally {
      setTogglingStatus(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (res.ok) {
        setUsers(data.users || [])
      }
    } catch (err) {
      console.error('Fetch admin users error:', err)
    }
  }

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/admin/messages')
      const data = await res.json()
      if (res.ok) {
        setMessages(data.messages || [])
      }
    } catch (err) {
      console.error('Fetch admin messages error:', err)
    }
  }

  const handleToggleBan = async (user: any) => {
    const newBanStatus = !user.is_banned
    const actionText = newBanStatus ? 'BAN' : 'UNBAN'
    if (!window.confirm(`Are you sure you want to ${actionText} user @${user.username}?`)) return

    setTogglingBanId(user.id)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, is_banned: newBanStatus })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setUsers(users.map((u) => (u.id === user.id ? { ...u, is_banned: newBanStatus } : u)))
      }
    } catch (err) {
      console.error('Toggle ban error:', err)
    } finally {
      setTogglingBanId(null)
    }
  }

  const handleDeleteMessage = async (msgId: string) => {
    if (!window.confirm('Delete this message globally?')) return
    setDeletingMsgId(msgId)
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: msgId })
      })
      if (res.ok) {
        setMessages(messages.filter((m) => m.id !== msgId))
      }
    } catch (err) {
      console.error('Delete message error:', err)
    } finally {
      setDeletingMsgId(null)
    }
  }

  const filteredUsers = users.filter((u) => {
    if (!userSearch.trim()) return true
    const term = userSearch.toLowerCase()
    return (
      u.display_name?.toLowerCase().includes(term) ||
      u.username?.toLowerCase().includes(term) ||
      u.short_id?.toLowerCase().includes(term)
    )
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="flex items-center gap-2 text-sm text-[#5f6368]">
          <div className="w-4 h-4 border-2 border-[#1a73e8] border-t-transparent rounded-full animate-spin" />
          <span>Verifying admin privileges...</span>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen max-w-6xl mx-auto p-2.5 sm:p-6 space-y-3 sm:space-y-4">
      {/* Top Bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 bg-white rounded-2xl md-card border border-[#e8eaed]">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Link
            href="/"
            className="p-2 rounded-xl bg-[#f1f4f8] hover:bg-[#e8eaed] text-[#5f6368] transition-colors shrink-0 font-mono"
            title="⍙⌖⍜⌰⏃⍀⟟⌇"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-[#1f1f1f] truncate">Admin Control Panel</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fef7e0] text-[#b06000] border border-[#fce8b2] shrink-0">
                <Shield className="w-3 h-3" /> SUPERADMIN
              </span>
            </div>
            <p className="text-xs text-[#5f6368] hidden sm:block">Monitor conversations, manage users, and enforce platform safety</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Active status toggle button */}
          <button
            onClick={handleToggleAdminStatus}
            disabled={togglingStatus}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
              isOnlineState
                ? 'bg-[#e6f4ea] text-[#137333] hover:bg-[#ceead6] border border-[#ceead6]'
                : 'bg-[#f1f4f8] text-[#5f6368] hover:bg-[#e8eaed] border border-[#dadce0]'
            }`}
            title="Toggle visible online status"
          >
            {isOnlineState ? <Eye className="w-3.5 h-3.5 text-[#1e8e3e]" /> : <EyeOff className="w-3.5 h-3.5 text-[#5f6368]" />}
            <span>{isOnlineState ? 'Status: Online (Visible)' : 'Status: Offline (Hidden)'}</span>
          </button>

          <button
            onClick={() => { fetchUsers(); fetchMessages() }}
            className="p-2 rounded-xl bg-[#f1f4f8] hover:bg-[#e8eaed] text-[#5f6368] text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'users' ? 'bg-[#1a73e8] text-white shadow-xs' : 'bg-white text-[#5f6368] hover:bg-[#f1f4f8] border border-[#e8eaed]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>All Registered Users ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('messages')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'messages' ? 'bg-[#1a73e8] text-white shadow-xs' : 'bg-white text-[#5f6368] hover:bg-[#f1f4f8] border border-[#e8eaed]'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>All Platform Messages ({messages.length})</span>
        </button>
      </div>

      {/* ─── TAB 1: USERS MANAGEMENT ─── */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl md-card border border-[#e8eaed] overflow-hidden">
          {/* Search bar */}
          <div className="p-3.5 border-b border-[#e8eaed] bg-[#f8fafb]">
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-[#dadce0] max-w-sm">
              <Search className="w-4 h-4 text-[#5f6368]" />
              <input
                type="text"
                placeholder="Search user by name, username, or #ID..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full text-xs outline-none text-[#1f1f1f] placeholder-[#9aa0a6]"
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafb] text-[#5f6368] uppercase font-semibold text-[10px] border-b border-[#e8eaed]">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Short ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f4f8]">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#f8fafb] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={u.avatar_url}
                          alt={u.display_name}
                          className="w-8 h-8 rounded-full bg-white object-cover ring-1 ring-[#e8eaed]"
                        />
                        <div>
                          <p className="font-semibold text-[#1f1f1f]">{u.display_name}</p>
                          <p className="text-[10px] text-[#5f6368]">@{u.username}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-[#1a73e8]">
                      #{u.short_id}
                    </td>

                    <td className="py-3 px-4">
                      {u.is_banned ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#fce8e6] text-[#d93025]">
                          <Ban className="w-3 h-3" /> Banned
                        </span>
                      ) : u.is_online ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#e6f4ea] text-[#137333]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1e8e3e]" /> Online
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#9aa0a6]">Offline</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {u.is_admin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fef7e0] text-[#b06000]">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#5f6368]">User</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-[#9aa0a6]">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {u.id !== currentUser?.id && !u.is_admin && (
                        <button
                          onClick={() => handleToggleBan(u)}
                          disabled={togglingBanId === u.id}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                            u.is_banned
                              ? 'bg-[#e6f4ea] hover:bg-[#ceead6] text-[#137333]'
                              : 'bg-[#fce8e6] hover:bg-[#fad2cf] text-[#d93025]'
                          }`}
                        >
                          {u.is_banned ? 'Unban User' : 'Ban User'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 2: GLOBAL MESSAGES OVERSIGHT ─── */}
      {activeTab === 'messages' && (
        <div className="bg-white rounded-2xl md-card border border-[#e8eaed] overflow-hidden p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1f1f1f]">Recent Messages Across Platform</h2>
            <span className="text-xs text-[#5f6368]">{messages.length} messages loaded</span>
          </div>

          <div className="divide-y divide-[#f1f4f8] max-h-[600px] overflow-y-auto">
            {messages.length === 0 ? (
              <p className="py-8 text-center text-xs text-[#9aa0a6]">No messages found</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="py-3 flex items-start justify-between gap-3 group">
                  <div className="flex items-start gap-3 min-w-0">
                    <img
                      src={m.sender?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=u'}
                      alt=""
                      className="w-8 h-8 rounded-full bg-white object-cover ring-1 ring-[#e8eaed] shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-[#1f1f1f]">
                          {m.sender?.display_name || 'User'}
                        </span>
                        <span className="text-[10px] font-mono text-[#1a73e8]">
                          #{m.sender?.short_id}
                        </span>
                        <span className="text-[10px] text-[#9aa0a6]">
                          {new Date(m.created_at).toLocaleString()}
                        </span>
                      </div>

                      {m.unsent ? (
                        <p className="text-xs italic text-[#9aa0a6]">⚠️ Message was unsent</p>
                      ) : m.content ? (
                        <p className="text-xs text-[#3c4043] break-words">{m.content}</p>
                      ) : (
                        <p className="text-xs italic text-[#5f6368]">Attached media file</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteMessage(m.id)}
                    disabled={deletingMsgId === m.id}
                    className="p-1.5 rounded-lg text-[#d93025] hover:bg-[#fce8e6] opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    title="Delete message globally"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </main>
  )
}
