'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { UserProfile, Conversation, ChatMessage, MessageRequest } from '@/lib/types'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'
import AuthScreen from '@/components/AuthScreen'
import GoogleHeader from '@/components/GoogleHeader'
import ChatSidebar from '@/components/ChatSidebar'
import ChatHeader from '@/components/ChatHeader'
import MessageBubble from '@/components/MessageBubble'
import MessageInput from '@/components/MessageInput'
import ProfileModal from '@/components/ProfileModal'
import CreateGroupModal from '@/components/CreateGroupModal'
import { MessageSquare, Users, Sparkles, Send, UserPlus } from 'lucide-react'

export default function Home() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Chat State
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar')

  // Requests State
  const [incomingRequests, setIncomingRequests] = useState<MessageRequest[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<MessageRequest[]>([])

  // Modals
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)

  // Typing state
  const [typingUser, setTypingUser] = useState<string | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabaseRoomRef = useRef<any>(null)

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
  }

  // 1. Check current authenticated user session
  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session')
      const data = await res.json()
      if (data.user) {
        setCurrentUser(data.user)
      } else {
        setCurrentUser(null)
      }
    } catch {
      setCurrentUser(null)
    } finally {
      setAuthLoading(false)
    }
  }, [])

  useEffect(() => {
    checkSession()
  }, [checkSession])

  // 2. Fetch Conversations & Requests
  const fetchConversations = useCallback(async () => {
    if (!currentUser) return
    try {
      const res = await fetch('/api/conversations')
      const data = await res.json()
      if (res.ok && data.conversations) {
        setConversations(data.conversations)
      }
    } catch (err) {
      console.error('Fetch convs error:', err)
    }
  }, [currentUser])

  const fetchRequests = useCallback(async () => {
    if (!currentUser) return
    try {
      const res = await fetch('/api/requests')
      const data = await res.json()
      if (res.ok) {
        setIncomingRequests(data.incoming || [])
        setOutgoingRequests(data.outgoing || [])
      }
    } catch (err) {
      console.error('Fetch requests error:', err)
    }
  }, [currentUser])

  useEffect(() => {
    if (currentUser) {
      fetchConversations()
      fetchRequests()
    }
  }, [currentUser, fetchConversations, fetchRequests])

  // 3. Fetch active conversation messages
  const fetchActiveMessages = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/conversations/${convId}`)
      const data = await res.json()
      if (res.ok) {
        setMessages(data.messages || [])
        if (data.conversation) {
          setActiveConv(data.conversation)
        }
      }
    } catch (err) {
      console.error('Fetch active messages error:', err)
    }
  }, [])

  useEffect(() => {
    if (selectedConvId) {
      fetchActiveMessages(selectedConvId)
      setMobileView('chat')
    } else {
      setActiveConv(null)
      setMessages([])
    }
  }, [selectedConvId, fetchActiveMessages])

  useEffect(() => {
    scrollToBottom(false)
  }, [messages, typingUser, selectedConvId])

  // 4. Supabase Realtime Listener
  useEffect(() => {
    if (!currentUser || !isSupabaseConfigured || !supabase) return

    const client = supabase

    // Realtime channel for instant message delivery & typing broadcast
    const channel = client
      .channel('chat-global-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as any
          // If message belongs to active conversation, append it
          if (newMsg.conversation_id === selectedConvId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev
              return [
                ...prev,
                {
                  id: newMsg.id,
                  conversation_id: newMsg.conversation_id,
                  sender_id: newMsg.sender_id,
                  content: newMsg.content,
                  media_url: newMsg.media_url,
                  media_type: newMsg.media_type,
                  reactions: newMsg.reactions || {},
                  unsent: newMsg.unsent || false,
                  seen_by: newMsg.seen_by || [],
                  created_at: newMsg.created_at
                }
              ]
            })
          }
          // Refresh conversation list to update last message preview
          fetchConversations()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const updated = payload.new as any
          setMessages((prev) =>
            prev.map((m) =>
              m.id === updated.id
                ? {
                    ...m,
                    content: updated.content,
                    media_url: updated.media_url,
                    reactions: updated.reactions || {},
                    unsent: updated.unsent || false,
                    seen_by: updated.seen_by || []
                  }
                : m
            )
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          const deletedId = (payload.old as any)?.id
          if (deletedId) {
            setMessages((prev) => prev.filter((m) => m.id !== deletedId))
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_requests' },
        () => {
          fetchRequests()
          fetchConversations()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          const updatedProfile = payload.new as UserProfile
          // Update in conversations member list if present
          setConversations((prev) =>
            prev.map((c) => ({
              ...c,
              members: c.members?.map((m) => (m.id === updatedProfile.id ? { ...m, ...updatedProfile } : m))
            }))
          )
          if (activeConv) {
            setActiveConv((prev) =>
              prev
                ? {
                    ...prev,
                    members: prev.members?.map((m) =>
                      m.id === updatedProfile.id ? { ...m, ...updatedProfile } : m
                    )
                  }
                : null
            )
          }
        }
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { convId, senderName, senderId, isTyping } = payload.payload || {}
        if (convId === selectedConvId && senderId !== currentUser.id) {
          setTypingUser(isTyping ? senderName : null)
        }
      })
      .subscribe()

    supabaseRoomRef.current = channel

    return () => {
      client.removeChannel(channel)
    }
  }, [currentUser, selectedConvId, activeConv, fetchConversations, fetchRequests])

  // 5. Typing Indicator Trigger
  const handleTyping = () => {
    if (!currentUser || !selectedConvId) return

    if (supabaseRoomRef.current) {
      supabaseRoomRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          convId: selectedConvId,
          senderName: currentUser.display_name,
          senderId: currentUser.id,
          isTyping: true
        }
      })
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      if (supabaseRoomRef.current) {
        supabaseRoomRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            convId: selectedConvId,
            senderName: currentUser.display_name,
            senderId: currentUser.id,
            isTyping: false
          }
        })
      }
    }, 2000)
  }

  // 6. Send Message
  const handleSendMessage = async (text: string, mediaUrl?: string, mediaType?: 'image' | 'video') => {
    if (!currentUser || !selectedConvId) return

    try {
      const res = await fetch(`/api/conversations/${selectedConvId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text,
          media_url: mediaUrl,
          media_type: mediaType
        })
      })
      const data = await res.json()

      if (res.ok && data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev
          return [...prev, data.message]
        })
        fetchConversations()
      }
    } catch (err) {
      console.error('Send message error:', err)
    }
  }

  // 7. React to Message
  const handleReact = async (messageId: string, emoji: string) => {
    if (!currentUser) return

    const target = messages.find((m) => m.id === messageId)
    if (!target) return

    const currentReactions = { ...(target.reactions || {}) }
    const reactors = currentReactions[emoji] ? [...currentReactions[emoji]] : []
    const idx = reactors.indexOf(currentUser.id)

    if (idx >= 0) {
      reactors.splice(idx, 1)
      if (reactors.length === 0) {
        delete currentReactions[emoji]
      } else {
        currentReactions[emoji] = reactors
      }
    } else {
      currentReactions[emoji] = [...reactors, currentUser.id]
    }

    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, reactions: currentReactions } : m))
    )

    if (isSupabaseConfigured && supabase) {
      await supabase.from('messages').update({ reactions: currentReactions }).eq('id', messageId)
    }
  }

  // 8. Unsend Message
  const handleUnsend = async (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, unsent: true, content: '', media_url: undefined, reactions: {} }
          : m
      )
    )

    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('messages')
        .update({ unsent: true, content: '', media_url: null, reactions: {} })
        .eq('id', messageId)
    }
  }

  // 9. Accept / Decline Request
  const handleAcceptRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' })
      })
      const data = await res.json()
      if (res.ok && data.conversation_id) {
        fetchRequests()
        await fetchConversations()
        setSelectedConvId(data.conversation_id)
      }
    } catch (err) {
      console.error('Accept request error:', err)
    }
  }

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await fetch(`/api/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline' })
      })
      fetchRequests()
    } catch (err) {
      console.error('Decline request error:', err)
    }
  }

  // 10. Sign Out
  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    setCurrentUser(null)
    setSelectedConvId(null)
    setConversations([])
    setMessages([])
  }

  // If loading auth
  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center p-4 bg-[#f8fafb]">
        <div className="flex items-center gap-2.5 text-xs text-[#5f6368]">
          <div className="w-4 h-4 border-2 border-[#1a73e8] border-t-transparent rounded-full animate-spin" />
          <span>Loading Chat Hub...</span>
        </div>
      </div>
    )
  }

  // If not logged in -> Show Auth Screen
  if (!currentUser) {
    return <AuthScreen onAuthSuccess={(user) => { setCurrentUser(user); fetchConversations(); fetchRequests() }} />
  }

  return (
    <main className="h-screen flex flex-col max-w-6xl mx-auto p-2 sm:p-4 overflow-hidden">
      {/* Top Header */}
      <GoogleHeader
        currentUser={currentUser}
        onOpenProfileModal={() => setShowProfileModal(true)}
        onSignOut={handleSignOut}
      />

      {/* Main App Body */}
      <div className="flex-1 flex gap-3 sm:gap-4 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <div className={`w-full md:w-80 h-full shrink-0 ${mobileView === 'sidebar' ? 'flex' : 'hidden md:flex'}`}>
          <ChatSidebar
            currentUser={currentUser}
            conversations={conversations}
            selectedConvId={selectedConvId}
            onSelectConversation={(id) => {
              setSelectedConvId(id)
              setMobileView('chat')
            }}
            incomingRequests={incomingRequests}
            outgoingRequests={outgoingRequests}
            onAcceptRequest={handleAcceptRequest}
            onDeclineRequest={handleDeclineRequest}
            onOpenCreateGroup={() => setShowCreateGroupModal(true)}
            onRequestSent={fetchRequests}
          />
        </div>

        {/* Active Chat Conversation Area */}
        <div
          className={`flex-1 md-card flex flex-col min-h-0 overflow-hidden bg-white rounded-2xl border border-[#e8eaed] ${
            mobileView === 'sidebar' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {selectedConvId && activeConv ? (
            <>
              {/* Chat Header */}
              <ChatHeader
                currentUser={currentUser}
                conversation={activeConv}
                onBack={() => setMobileView('sidebar')}
              />

              {/* Messages Viewport */}
              <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4 scroll-smooth space-y-1">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#5f6368] space-y-2">
                    <div className="w-12 h-12 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-[#1f1f1f]">Start the conversation</h3>
                    <p className="text-xs max-w-xs">
                      Send a private message, photo, video, or emoji reaction to break the ice!
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      currentUserId={currentUser.id}
                      onReact={handleReact}
                      onUnsend={handleUnsend}
                    />
                  ))
                )}

                {/* Live Typing Indicator */}
                {typingUser && (
                  <div className="flex items-center gap-2 my-2 animate-fade-in">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#f1f4f8] border border-[#e8eaed] text-[#5f6368]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1a73e8] animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1a73e8] animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1a73e8] animate-bounce" />
                      <span className="text-[11px] font-medium ml-1 text-[#3c4043]">{typingUser} is typing...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer */}
              <div className="p-3 sm:px-6 sm:py-3.5 border-t border-[#e8eaed] bg-white shrink-0">
                <MessageInput
                  onSendMessage={handleSendMessage}
                  onTyping={handleTyping}
                  placeholder={`Message ${activeConv.type === 'group' ? activeConv.name : activeConv.members?.find((m) => m.id !== currentUser.id)?.display_name || 'chat'}...`}
                />
              </div>
            </>
          ) : (
            /* Empty State when no conversation is selected */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#1a73e8] to-[#4285f4] text-white flex items-center justify-center shadow-lg">
                <MessageSquare className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-[#1f1f1f]">Select or Start a Conversation</h2>
                <p className="text-xs text-[#5f6368] max-w-sm leading-relaxed">
                  Choose a chat from the sidebar or click <strong>"Find"</strong> to search a friend's 6-character Short ID to connect!
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[#f8fafb] border border-[#e8eaed] text-left space-y-1 text-xs">
                <p className="font-semibold text-[#1f1f1f]">Your Short ID:</p>
                <p className="font-mono text-base font-extrabold text-[#1a73e8] tracking-widest">#{currentUser.short_id}</p>
                <p className="text-[10px] text-[#5f6368]">Share this ID with friends so they can request to message you.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showProfileModal && (
        <ProfileModal
          user={currentUser}
          onSave={(updated) => setCurrentUser(updated)}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {showCreateGroupModal && (
        <CreateGroupModal
          currentUser={currentUser}
          onGroupCreated={(group) => {
            fetchConversations()
            setSelectedConvId(group.id)
          }}
          onClose={() => setShowCreateGroupModal(false)}
        />
      )}
    </main>
  )
}
