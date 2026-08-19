'use client'

import React, { useState } from 'react'
import { UserProfile, Conversation, MessageRequest, DEFAULT_AVATAR } from '@/lib/types'
import {
  MessageSquare,
  Users,
  UserPlus,
  Search,
  Check,
  X,
  Plus,
  MoreVertical,
  Trash2,
  Ban,
  ShieldAlert,
  Send
} from 'lucide-react'

interface ChatSidebarProps {
  currentUser: UserProfile
  conversations: Conversation[]
  selectedConvId: string | null
  onSelectConversation: (convId: string) => void
  incomingRequests: MessageRequest[]
  outgoingRequests: MessageRequest[]
  onAcceptRequest: (requestId: string) => void
  onDeclineRequest: (requestId: string) => void
  onOpenCreateGroup: () => void
  onRequestSent: () => void
  onConversationsChange?: () => void
}

export default function ChatSidebar({
  currentUser,
  conversations,
  selectedConvId,
  onSelectConversation,
  incomingRequests,
  outgoingRequests,
  onAcceptRequest,
  onDeclineRequest,
  onOpenCreateGroup,
  onRequestSent,
  onConversationsChange
}: ChatSidebarProps) {
  const [activeTab, setActiveTab] = useState<'chats' | 'requests' | 'search'>('chats')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [sendingRequestId, setSendingRequestId] = useState<string | null>(null)
  const [requestMessage, setRequestMessage] = useState('')
  const [selectedSearchUser, setSelectedSearchUser] = useState<UserProfile | null>(null)
  const [requestSentSuccess, setRequestSentSuccess] = useState(false)

  // Sidebar item context menu
  const [activeMenuConvId, setActiveMenuConvId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Filter conversations by search term when in 'chats' tab
  const [convFilter, setConvFilter] = useState('')

  const filteredConversations = conversations.filter((c) => {
    if (!convFilter.trim()) return true
    const term = convFilter.toLowerCase()
    if (c.type === 'group') {
      return c.name?.toLowerCase().includes(term)
    }
    const otherMember = c.members?.find((m) => m.id !== currentUser.id)
    return (
      otherMember?.display_name.toLowerCase().includes(term) ||
      otherMember?.username.toLowerCase().includes(term) ||
      otherMember?.short_id.toLowerCase().includes(term)
    )
  })

  // Search users API
  const handleSearchUsers = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return
    setSearching(true)
    setSearchError(null)
    setSelectedSearchUser(null)

    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery.trim())}`)
      const data = await res.json()
      if (res.ok) {
        setSearchResults(data.users || [])
        if (!data.users || data.users.length === 0) {
          setSearchError('No users found matching this Short ID or name')
        }
      } else {
        setSearchError(data.error || 'Search failed')
      }
    } catch (err: any) {
      setSearchError(err.message || 'Search error')
    } finally {
      setSearching(false)
    }
  }

  // Send message request
  const handleSendRequest = async (targetUser: UserProfile) => {
    setSendingRequestId(targetUser.id)
    setSearchError(null)

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_user_id: targetUser.id,
          message: requestMessage.trim()
        })
      })
      const data = await res.json()

      if (res.ok && data.success) {
        if (data.auto_accepted || data.already_connected) {
          onSelectConversation(data.conversation_id)
        }
        setRequestSentSuccess(true)
        onRequestSent()
        setTimeout(() => {
          setRequestSentSuccess(false)
          setSelectedSearchUser(null)
          setRequestMessage('')
        }, 1800)
      } else {
        setSearchError(data.error || 'Failed to send request')
      }
    } catch (err: any) {
      setSearchError(err.message || 'Network error')
    } finally {
      setSendingRequestId(null)
    }
  }

  // Delete Conversation
  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm('Delete this conversation? It will be removed from your chat list.')) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/conversations/${convId}/delete`, { method: 'POST' })
      if (res.ok && onConversationsChange) {
        onConversationsChange()
      }
    } catch (err) {
      console.error('Delete conv error:', err)
    } finally {
      setActionLoading(false)
      setActiveMenuConvId(null)
    }
  }

  // Block User
  const handleBlockUser = async (targetUserId: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm(`Block ${name}? They will no longer be able to message you.`)) return
    setActionLoading(true)
    try {
      const res = await fetch('/api/users/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: targetUserId, action: 'block' })
      })
      if (res.ok && onConversationsChange) {
        onConversationsChange()
      }
    } catch (err) {
      console.error('Block user error:', err)
    } finally {
      setActionLoading(false)
      setActiveMenuConvId(null)
    }
  }

  // Restrict User
  const handleRestrictUser = async (targetUserId: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm(`Restrict ${name}? Their interactions will be limited.`)) return
    setActionLoading(true)
    try {
      const res = await fetch('/api/users/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: targetUserId, action: 'restrict' })
      })
      if (res.ok && onConversationsChange) {
        onConversationsChange()
      }
    } catch (err) {
      console.error('Restrict user error:', err)
    } finally {
      setActionLoading(false)
      setActiveMenuConvId(null)
    }
  }

  const formatTime = (isoString?: string) => {
    if (!isoString) return ''
    try {
      const d = new Date(isoString)
      const now = new Date()
      const isToday = d.toDateString() === now.toDateString()
      if (isToday) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  return (
    <div className="w-full md:w-80 h-full flex flex-col bg-white rounded-2xl md-card border border-[#e8eaed] overflow-hidden shrink-0">
      {/* Header & Tabs */}
      <div className="p-3 border-b border-[#e8eaed] bg-[#f8fafb] space-y-2.5 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 flex items-center gap-1 bg-[#e8eaed] p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('chats')}
              className={`flex-1 justify-center px-2 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition-all flex items-center gap-1 sm:gap-1.5 ${
                activeTab === 'chats' ? 'bg-white text-[#1a73e8] shadow-xs' : 'text-[#5f6368] hover:text-[#1f1f1f]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chats</span>
            </button>

            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 justify-center px-2 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition-all flex items-center gap-1 sm:gap-1.5 relative ${
                activeTab === 'requests' ? 'bg-white text-[#1a73e8] shadow-xs' : 'text-[#5f6368] hover:text-[#1f1f1f]'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Requests</span>
              {incomingRequests.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#d93025] text-white text-[9px] font-bold flex items-center justify-center -ml-0.5">
                  {incomingRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('search')}
              className={`flex-1 justify-center px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition-all flex items-center gap-1 ${
                activeTab === 'search' ? 'bg-white text-[#1a73e8] shadow-xs' : 'text-[#5f6368] hover:text-[#1f1f1f]'
              }`}
              title="Find by ID"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Find</span>
            </button>
          </div>

          <button
            onClick={onOpenCreateGroup}
            className="p-1.5 rounded-xl bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] transition-colors shrink-0"
            title="Create Group Chat"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── TAB 1: CHATS LIST ─── */}
      {activeTab === 'chats' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Quick Filter */}
          <div className="px-3 pt-2.5 pb-1.5 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#f1f4f8] rounded-xl text-xs border border-transparent focus-within:border-[#1a73e8] focus-within:bg-white transition-all">
              <Search className="w-3.5 h-3.5 text-[#5f6368]" />
              <input
                type="text"
                placeholder="Filter chats..."
                value={convFilter}
                onChange={(e) => setConvFilter(e.target.value)}
                className="w-full bg-transparent outline-none text-[#1f1f1f] text-xs placeholder-[#9aa0a6]"
              />
              {convFilter && (
                <button onClick={() => setConvFilter('')} className="text-[#9aa0a6] hover:text-[#5f6368]">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Conversations Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#f1f4f8]">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#5f6368] space-y-2">
                <p className="font-semibold text-[#1f1f1f]">No conversations yet</p>
                <p className="text-[11px]">Click <strong>"Find"</strong> above to search a friend's Short ID and start chatting!</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isGroup = conv.type === 'group'
                const otherMember = !isGroup ? conv.members?.find((m) => m.id !== currentUser.id) : null
                const title = isGroup ? conv.name : otherMember?.display_name || 'Direct Chat'
                const avatar = isGroup
                  ? conv.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${conv.id}`
                  : otherMember?.avatar_url || DEFAULT_AVATAR
                const isOnline = otherMember?.is_online || false
                const isSelected = selectedConvId === conv.id
                const isMenuOpen = activeMenuConvId === conv.id

                return (
                  <div
                    key={conv.id}
                    onClick={() => onSelectConversation(conv.id)}
                    className={`w-full p-3 flex items-start gap-3 text-left transition-colors relative cursor-pointer group ${
                      isSelected ? 'bg-[#e8f0fe]' : 'hover:bg-[#f8fafb]'
                    }`}
                  >
                    {/* Avatar with online badge */}
                    <div className="relative shrink-0">
                      <img
                        src={avatar}
                        alt={title || 'Avatar'}
                        className="w-10 h-10 rounded-full bg-[#f1f4f8] object-cover ring-1 ring-[#e8eaed]"
                      />
                      {!isGroup && isOnline && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#1e8e3e] ring-2 ring-white" />
                      )}
                      {isGroup && (
                        <span className="absolute -bottom-0.5 -right-0.5 p-0.5 rounded-full bg-[#1a73e8] text-white">
                          <Users className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>

                    {/* Chat preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-semibold text-[#1f1f1f] truncate">
                          {title}
                        </span>
                        <span className="text-[10px] text-[#9aa0a6] shrink-0 ml-1">
                          {formatTime(conv.last_message?.created_at || conv.created_at)}
                        </span>
                      </div>

                      <p className="text-[11px] text-[#5f6368] truncate">
                        {conv.last_message ? (
                          conv.last_message.unsent ? (
                            <span className="italic text-[#9aa0a6]">Message unsent</span>
                          ) : conv.last_message.media_url && !conv.last_message.content ? (
                            conv.last_message.media_type === 'video' ? '🎥 [Video]' : '📷 [Photo]'
                          ) : (
                            conv.last_message.content
                          )
                        ) : (
                          <span className="italic text-[#9aa0a6]">No messages yet</span>
                        )}
                      </p>
                    </div>

                    {/* Action 3-Dots Menu Trigger */}
                    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveMenuConvId(isMenuOpen ? null : conv.id)
                        }}
                        className="p-1 rounded-full text-[#9aa0a6] hover:text-[#1f1f1f] hover:bg-[#e8eaed] transition-colors"
                        title="Chat options"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {/* Dropdown Menu */}
                      {isMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-30"
                            onClick={() => setActiveMenuConvId(null)}
                          />

                          <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-[#e8eaed] p-1.5 z-40 animate-in fade-in zoom-in-95 duration-150 space-y-0.5 text-xs">
                            <button
                              onClick={(e) => handleDeleteConversation(conv.id, e)}
                              disabled={actionLoading}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#d93025] hover:bg-[#fce8e6] font-medium transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Chat</span>
                            </button>

                            {!isGroup && otherMember && (
                              <>
                                <button
                                  onClick={(e) => handleBlockUser(otherMember.id, otherMember.display_name, e)}
                                  disabled={actionLoading}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#5f6368] hover:bg-[#f1f4f8] font-medium transition-colors"
                                >
                                  <Ban className="w-3.5 h-3.5 text-[#d93025]" />
                                  <span>Block User</span>
                                </button>

                                <button
                                  onClick={(e) => handleRestrictUser(otherMember.id, otherMember.display_name, e)}
                                  disabled={actionLoading}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#5f6368] hover:bg-[#f1f4f8] font-medium transition-colors"
                                >
                                  <ShieldAlert className="w-3.5 h-3.5 text-[#b06000]" />
                                  <span>Restrict User</span>
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: MESSAGE REQUESTS ─── */}
      {activeTab === 'requests' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Incoming Requests */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">
                Incoming Requests ({incomingRequests.length})
              </h3>
            </div>

            {incomingRequests.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#f8fafb] border border-[#e8eaed] text-center text-xs text-[#5f6368]">
                No pending message requests
              </div>
            ) : (
              incomingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 rounded-2xl bg-[#f8fafb] border border-[#e8eaed] space-y-2 shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={req.from_user?.avatar_url || DEFAULT_AVATAR}
                      alt={req.from_user?.display_name}
                      className="w-9 h-9 rounded-full bg-white object-cover ring-1 ring-[#e8eaed]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#1f1f1f] truncate">
                        {req.from_user?.display_name}
                      </p>
                      <p className="text-[10px] font-mono text-[#1a73e8]">
                        #{req.from_user?.short_id} • @{req.from_user?.username}
                      </p>
                    </div>
                  </div>

                  {req.message && (
                    <p className="text-xs text-[#3c4043] bg-white p-2 rounded-xl border border-[#e8eaed] italic">
                      "{req.message}"
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => onAcceptRequest(req.id)}
                      className="flex-1 py-1.5 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" /> Accept
                    </button>
                    <button
                      onClick={() => onDeclineRequest(req.id)}
                      className="px-3 py-1.5 rounded-xl bg-[#f1f4f8] hover:bg-[#e8eaed] text-[#5f6368] text-xs font-semibold transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Outgoing Requests */}
          <div className="space-y-2 pt-2 border-t border-[#e8eaed]">
            <h3 className="text-xs font-bold text-[#5f6368] uppercase tracking-wider">
              Sent Requests ({outgoingRequests.length})
            </h3>

            {outgoingRequests.length === 0 ? (
              <p className="text-[11px] text-[#9aa0a6] text-center">No sent requests</p>
            ) : (
              outgoingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-2.5 rounded-xl bg-[#f8fafb] border border-[#e8eaed] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <img
                      src={req.to_user?.avatar_url || DEFAULT_AVATAR}
                      alt={req.to_user?.display_name}
                      className="w-7 h-7 rounded-full bg-white object-cover"
                    />
                    <span className="font-medium text-[#1f1f1f] truncate">{req.to_user?.display_name}</span>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    req.status === 'accepted' ? 'bg-[#e6f4ea] text-[#137333]' : 'bg-[#fef7e0] text-[#b06000]'
                  }`}>
                    {req.status === 'accepted' ? 'Accepted' : 'Pending'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: SEARCH BY ID ─── */}
      {activeTab === 'search' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <form onSubmit={handleSearchUsers} className="space-y-2">
            <label className="text-xs font-bold text-[#1f1f1f]">Enter Friend's 6-Char ID</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-1.5 px-3 py-2 bg-[#f1f4f8] rounded-xl border border-[#dadce0] focus-within:border-[#1a73e8] focus-within:bg-white transition-all">
                <span className="text-sm font-mono font-bold text-[#1a73e8]">#</span>
                <input
                  type="text"
                  placeholder="e.g. A7K2M9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                  className="w-full bg-transparent font-mono uppercase tracking-wider font-bold text-xs text-[#1f1f1f] outline-none"
                  maxLength={10}
                />
              </div>
              <button
                type="submit"
                disabled={searching || !searchQuery.trim()}
                className="px-3.5 py-2 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                {searching ? '...' : 'Search'}
              </button>
            </div>
            <p className="text-[10px] text-[#5f6368]">Ask your friend for their 6-character Short ID found in their profile menu.</p>
          </form>

          {searchError && (
            <div className="p-3 rounded-xl bg-[#fce8e6] text-[#d93025] text-xs font-medium text-center">
              {searchError}
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-[11px] font-semibold text-[#5f6368]">Search Result</p>
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="p-3 rounded-2xl bg-[#f8fafb] border border-[#e8eaed] space-y-2.5"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={user.avatar_url || DEFAULT_AVATAR}
                      alt={user.display_name}
                      className="w-10 h-10 rounded-full bg-white object-cover ring-1 ring-[#e8eaed]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#1f1f1f] truncate">{user.display_name}</p>
                      <p className="text-[10px] font-mono text-[#1a73e8]">#{user.short_id} • @{user.username}</p>
                      {user.bio && <p className="text-[10px] text-[#5f6368] truncate italic">"{user.bio}"</p>}
                    </div>
                  </div>

                  {selectedSearchUser?.id === user.id ? (
                    <div className="space-y-2 pt-1 animate-fade-in">
                      <input
                        type="text"
                        placeholder="Say hi or add a note... (optional)"
                        value={requestMessage}
                        onChange={(e) => setRequestMessage(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-[#dadce0] text-xs outline-none focus:border-[#1a73e8]"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSendRequest(user)}
                          disabled={Boolean(sendingRequestId)}
                          className="flex-1 py-1.5 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          {requestSentSuccess ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-white" /> Request Sent!
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" /> Send Request
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setSelectedSearchUser(null)}
                          className="px-2.5 py-1.5 rounded-xl text-xs text-[#5f6368] hover:bg-[#e8eaed]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedSearchUser(user)}
                      className="w-full py-1.5 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Connect / Send Request
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
