'use client'

import React, { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { fetcher } from '@/lib/swr-fetcher'
import { UserProfile, Conversation, ChatMessage, MessageRequest } from '@/lib/types'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'
import AuthScreen from '@/components/AuthScreen'
import GoogleHeader from '@/components/GoogleHeader'
import FeedView from '@/components/FeedView'
import ChatSidebar from '@/components/ChatSidebar'
import ChatHeader from '@/components/ChatHeader'
import MessageBubble from '@/components/MessageBubble'
import MessageInput from '@/components/MessageInput'
import ProfileModal from '@/components/ProfileModal'
import CreateGroupModal from '@/components/CreateGroupModal'
import { MessageSquare } from 'lucide-react'

export default function Home() {
  // Main Tab: 'feed' (Social Media) or 'chat' (Messaging)
  const [mainTab, setMainTab] = useState<'feed' | 'chat'>('feed')

  // SWR: User Session (Cached in memory)
  const { data: sessionData, isLoading: authLoading, mutate: mutateSession } = useSWR(
    '/api/auth/session',
    fetcher,
    { revalidateOnFocus: true, dedupingInterval: 3000 }
  )
  const currentUser: UserProfile | null = sessionData?.user || null

  // SWR: Conversations (Cached in memory with stale-while-revalidate)
  const { data: convsData, mutate: mutateConversations } = useSWR(
    currentUser ? '/api/conversations' : null,
    fetcher,
    { revalidateOnFocus: true, dedupingInterval: 2000 }
  )
  const conversations: Conversation[] = convsData?.conversations || []

  // SWR: Message Requests
  const { data: reqsData, mutate: mutateRequests } = useSWR(
    currentUser ? '/api/requests' : null,
    fetcher,
    { revalidateOnFocus: true, dedupingInterval: 2000 }
  )
  const incomingRequests: MessageRequest[] = reqsData?.incoming || []
  const outgoingRequests: MessageRequest[] = reqsData?.outgoing || []

  // Active Chat State
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [mobileView, setMobileView] = useState<'sidebar' | 'chat'>('sidebar')

  // SWR: Active Conversation detail & messages
  const { data: activeConvData, mutate: mutateActiveConv } = useSWR(
    selectedConvId ? `/api/conversations/${selectedConvId}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 2000 }
  )

  const activeConv: Conversation | null = activeConvData?.conversation || null

  // Sync server messages into local state
  useEffect(() => {
    if (activeConvData?.messages) {
      setMessages((prev) => {
        // Keep optimistic messages scoped strictly to current selected conversation
        const optimistic = prev.filter((m) => m.id.startsWith('temp-') && m.conversation_id === selectedConvId)
        const serverMsgs = activeConvData.messages as ChatMessage[]
        const combined = [...serverMsgs]
        for (const opt of optimistic) {
          if (!combined.some((m) => m.content === opt.content && m.sender_id === opt.sender_id)) {
            combined.push(opt)
          }
        }
        return combined
      })
    }
  }, [activeConvData, selectedConvId])

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

  // Handle selected conversation change & mark as seen
  useEffect(() => {
    if (selectedConvId) {
      setMobileView('chat')
      setMessages([])
      fetch(`/api/conversations/${selectedConvId}/seen`, { method: 'POST' }).catch(() => {})
    } else {
      setMessages([])
    }
  }, [selectedConvId])

  useEffect(() => {
    scrollToBottom(false)
  }, [messages, typingUser, selectedConvId])

  // Supabase Realtime Listener for instant live messages & typing broadcast
  useEffect(() => {
    if (!currentUser || !isSupabaseConfigured || !supabase) return

    const client = supabase

    const channel = client
      .channel('chat-global-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as any
          if (newMsg.conversation_id === selectedConvId) {
            // Auto mark seen if from other user
            if (newMsg.sender_id !== currentUser.id) {
              fetch(`/api/conversations/${selectedConvId}/seen`, { method: 'POST' }).catch(() => {})
            }

            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev
              const filtered = prev.filter(
                (m) => !(m.id.startsWith('temp-') && m.content === newMsg.content && m.sender_id === newMsg.sender_id)
              )
              return [
                ...filtered,
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
          mutateConversations()
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
          mutateRequests()
          mutateConversations()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        () => {
          mutateConversations()
          mutateActiveConv()
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
  }, [currentUser, selectedConvId, mutateConversations, mutateRequests, mutateActiveConv])

  // Typing Indicator Trigger
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

  // 6. Send Message (Optimistic 0ms UI update)
  const handleSendMessage = async (text: string, mediaUrl?: string, mediaType?: 'image' | 'video') => {
    if (!currentUser || !selectedConvId) return

    const tempId = `temp-${Date.now()}`
    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversation_id: selectedConvId,
      sender_id: currentUser.id,
      sender_name: currentUser.display_name,
      sender_avatar: currentUser.avatar_url,
      content: text,
      media_url: mediaUrl,
      media_type: mediaType,
      reactions: {},
      unsent: false,
      seen_by: [currentUser.id],
      created_at: new Date().toISOString()
    }

    // Instantly append to state
    setMessages((prev) => [...prev, optimisticMsg])

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
        // Swap temp ID with real server ID
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? data.message : m))
        )
        mutateConversations()
      } else {
        // Rollback optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
      }
    } catch (err) {
      console.error('Send message error:', err)
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
    }
  }

  // 7. React to Message (Instant UI update)
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

  // 8. Unsend Message (Instant UI update)
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

  // 9. Accept / Decline Request (Optimistic UI updates)
  const handleAcceptRequest = async (requestId: string) => {
    mutateRequests(
      (current: any) => ({
        ...current,
        incoming: (current?.incoming || []).filter((r: any) => r.id !== requestId)
      }),
      false
    )

    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' })
      })
      const data = await res.json()
      if (res.ok && data.conversation_id) {
        await mutateConversations()
        setSelectedConvId(data.conversation_id)
        setMainTab('chat')
      } else {
        mutateRequests()
      }
    } catch (err) {
      console.error('Accept request error:', err)
      mutateRequests()
    }
  }

  const handleDeclineRequest = async (requestId: string) => {
    mutateRequests(
      (current: any) => ({
        ...current,
        incoming: (current?.incoming || []).filter((r: any) => r.id !== requestId)
      }),
      false
    )

    try {
      await fetch(`/api/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline' })
      })
      mutateRequests()
    } catch (err) {
      console.error('Decline request error:', err)
      mutateRequests()
    }
  }

  // 10. Sign Out
  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {}
    mutateSession({ user: null }, false)
    setSelectedConvId(null)
    setMessages([])
  }

  // If loading auth initial check
  if (authLoading && !sessionData) {
    return (
      <div className="h-screen flex items-center justify-center p-4 bg-[#f8fafb]">
        <div className="flex items-center gap-2.5 text-xs text-[#5f6368]">
          <div className="w-4 h-4 border-2 border-[#1a73e8] border-t-transparent rounded-full animate-spin" />
          <span className="font-mono tracking-widest">⍙⌖⍜⌰⏃⍀⟟⌇...</span>
        </div>
      </div>
    )
  }

  // If not logged in -> Show Auth Screen
  if (!currentUser) {
    return (
      <AuthScreen
        onAuthSuccess={(user) => {
          mutateSession({ user }, false)
          mutateConversations()
          mutateRequests()
        }}
      />
    )
  }

  // Find index of the very last outgoing message sent by current user to show Sent/Seen status
  const lastMyMsgIndex = messages.map((m) => m.sender_id === currentUser.id && !m.unsent).lastIndexOf(true)

  return (
    <main className="h-[100dvh] flex flex-col max-w-6xl mx-auto p-1.5 sm:p-4 overflow-hidden">
      {/* Top Header with Feed / Chat Switcher */}
      <GoogleHeader
        currentUser={currentUser}
        activeMainTab={mainTab}
        onMainTabChange={setMainTab}
        unreadCount={incomingRequests.length}
        onOpenProfileModal={() => setShowProfileModal(true)}
        onSignOut={handleSignOut}
        onUserUpdate={(updated) => mutateSession({ user: updated }, false)}
      />

      {/* Main Tab 1: SOCIAL NEWS FEED */}
      {mainTab === 'feed' && (
        <div className="flex-1 min-h-0 overflow-hidden">
          <FeedView currentUser={currentUser} />
        </div>
      )}

      {/* Main Tab 2: CHAT HUB & DIRECT MESSAGING */}
      {mainTab === 'chat' && (
        <div className="flex-1 flex gap-2 sm:gap-4 min-h-0 overflow-hidden">
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
              onRequestSent={() => mutateRequests()}
              onConversationsChange={() => {
                mutateConversations()
                if (selectedConvId) setSelectedConvId(null)
              }}
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

                {/* Messages Viewport with Messenger-Style Clustering */}
                <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4 scroll-smooth space-y-0.5">
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
                    messages.map((msg, idx) => {
                      const nextMsg = messages[idx + 1]
                      const prevMsg = messages[idx - 1]
                      const isLastInCluster = !nextMsg || nextMsg.sender_id !== msg.sender_id || nextMsg.unsent
                      const isFirstInCluster = !prevMsg || prevMsg.sender_id !== msg.sender_id || prevMsg.unsent
                      const isLastOutgoingMessage = idx === lastMyMsgIndex

                      return (
                        <MessageBubble
                          key={msg.id}
                          message={msg}
                          currentUserId={currentUser.id}
                          showAvatar={isLastInCluster}
                          showSenderName={isFirstInCluster && activeConv?.type === 'group'}
                          showDeliveryStatus={isLastOutgoingMessage}
                          onReact={handleReact}
                          onUnsend={handleUnsend}
                        />
                      )
                    })
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
      )}

      {/* Modals */}
      {showProfileModal && (
        <ProfileModal
          user={currentUser}
          onSave={(updated) => mutateSession({ user: updated }, false)}
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {showCreateGroupModal && (
        <CreateGroupModal
          currentUser={currentUser}
          onGroupCreated={(group) => {
            mutateConversations()
            setSelectedConvId(group.id)
            setMainTab('chat')
          }}
          onClose={() => setShowCreateGroupModal(false)}
        />
      )}
    </main>
  )
}
