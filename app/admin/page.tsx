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
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'users' | 'messages'>('users')

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

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (res.ok) setUsers(data.users || [])
    } catch (err) {
      console.error('Fetch admin users error:', err)
    }
  }

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/admin/messages')
      const data = await res.json()
      if (res.ok) setMessages(data.messages || [])
    } catch (err) {
      console.error('Fetch admin messages error:', err)
    }
  }

  const handleToggleBan = async (user: any) => {
    const newBanStatus = !user.is_banned
    const confirmMsg = newBanStatus
      ? `Are you sure you want to BAN ${user.display_name} (@${user.username})? They will not be able to log in or chat.`
      : `Unban ${user.display_name}?`

    if (!window.confirm(confirmMsg)) return

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
            className="p-2 rounded-xl bg-[#f1f4f8] hover:bg-[#e8eaed] text-[#5f6368] transition-colors shrink-0"
            title="Back to Chat Hub"
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
          <span>User Directory ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('messages')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'messages' ? 'bg-[#1a73e8] text-white shadow-xs' : 'bg-white text-[#5f6368] hover:bg-[#f1f4f8] border border-[#e8eaed]'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Global Messages Feed ({messages.length})</span>
        </button>
      </div>

      {/* ─── TAB 1: USERS DIRECTORY & MODERATION ─── */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl md-card border border-[#e8eaed] overflow-hidden space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 max-w-sm flex items-center gap-2 px-3 py-1.5 bg-[#f1f4f8] rounded-xl text-xs border border-[#dadce0]">
              <Search className="w-3.5 h-3.5 text-[#5f6368]" />
              <input
                type="text"
                placeholder="Search by name, @username, or #ID..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full bg-transparent outline-none text-[#1f1f1f]"
              />
            </div>
            <p className="text-xs text-[#5f6368]">{filteredUsers.length} users found</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafb] text-[#5f6368] border-b border-[#e8eaed]">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Short ID</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Joined</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f4f8]">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#f8fafb] transition-colors">
                    <td className="p-3 flex items-center gap-2.5">
                      <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full bg-[#f1f4f8] object-cover ring-1 ring-[#e8eaed]" />
                      <div className="min-w-0">
                        <p className="font-semibold text-[#1f1f1f] truncate">{u.display_name}</p>
                        <p className="text-[10px] text-[#5f6368]">@{u.username}</p>
                      </div>
                    </td>
                    <td className="p-3 font-mono font-bold text-[#1a73e8]">#{u.short_id}</td>
                    <td className="p-3">
                      {u.is_admin ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fef7e0] text-[#b06000]">Admin</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#f1f4f8] text-[#5f6368]">User</span>
                      )}
                    </td>
                    <td className="p-3">
                      {u.is_banned ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fce8e6] text-[#d93025]">
                          <Ban className="w-2.5 h-2.5" /> Banned
                        </span>
                      ) : u.is_online ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#e6f4ea] text-[#137333]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1e8e3e]" /> Online
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#9aa0a6]">Offline</span>
                      )}
                    </td>
                    <td className="p-3 text-[#5f6368]">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right">
                      {!u.is_admin && (
                        <button
                          onClick={() => handleToggleBan(u)}
                          disabled={togglingBanId === u.id}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors ${
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

      {/* ─── TAB 2: GLOBAL MESSAGES FEED & MODERATION ─── */}
      {activeTab === 'messages' && (
        <div className="bg-white rounded-2xl md-card border border-[#e8eaed] overflow-hidden space-y-3 p-4">
          <p className="text-xs text-[#5f6368]">Live audit feed of messages across all conversations</p>

          <div className="space-y-2 max-h-[600px] overflow-y-auto divide-y divide-[#f1f4f8]">
            {messages.length === 0 ? (
              <p className="text-xs text-[#5f6368] p-4 text-center">No messages in database</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="pt-3 pb-3 flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <img
                      src={m.sender?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=admin`}
                      alt=""
                      className="w-8 h-8 rounded-full bg-[#f1f4f8] object-cover ring-1 ring-[#e8eaed] shrink-0"
                    />
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#1f1f1f]">{m.sender?.display_name || 'User'}</span>
                        <span className="text-[10px] text-[#9aa0a6]">@{m.sender?.username}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#f1f4f8] text-[#5f6368]">
                          {m.conversation?.type === 'group' ? `Group: ${m.conversation.name}` : 'DM'}
                        </span>
                        <span className="text-[10px] text-[#9aa0a6]">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {m.media_url && (
                        <div className="max-w-[200px] rounded-xl overflow-hidden border border-[#dadce0]">
                          {m.media_type === 'video' ? (
                            <video src={m.media_url} controls className="w-full max-h-36 object-cover" />
                          ) : (
                            <img src={m.media_url} alt="" className="w-full max-h-36 object-cover" />
                          )}
                        </div>
                      )}

                      {m.content && <p className="text-[#3c4043] leading-relaxed break-words">{m.content}</p>}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteMessage(m.id)}
                    disabled={deletingMsgId === m.id}
                    className="p-1.5 rounded-lg text-[#d93025] hover:bg-[#fce8e6] transition-colors shrink-0"
                    title="Delete Message globally"
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
