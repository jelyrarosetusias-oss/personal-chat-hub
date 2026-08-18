'use client'

import React, { useState, useEffect, useRef } from 'react'
import GoogleHeader from '@/components/GoogleHeader'
import MessageBubble from '@/components/MessageBubble'
import MessageInput from '@/components/MessageInput'
import VisitorNameModal from '@/components/VisitorNameModal'
import OwnerLoginModal from '@/components/OwnerLoginModal'
import OwnerProfileModal from '@/components/OwnerProfileModal'
import OwnerSidebar from '@/components/OwnerSidebar'
import { MockStore, DirectMessage, OwnerStatus, OwnerProfile, ConversationSummary } from '@/lib/mock-store'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'
import { MessageSquare, ArrowLeft } from 'lucide-react'

export default function Home() {
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [visitorName, setVisitorName] = useState<string>('')
  const [isOwnerMode, setIsOwnerMode] = useState<boolean>(false)
  const [selectedVisitor, setSelectedVisitor] = useState<string | 'ALL'>('ALL')
  const [mobileOwnerView, setMobileOwnerView] = useState<'conversations' | 'chat'>('conversations')
  const [typingUser, setTypingUser] = useState<string | null>(null)

  const [ownerProfile, setOwnerProfile] = useState<OwnerProfile>({
    name: 'Darskie',
    bio: 'Software Engineer',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=owner-dars',
    statusNote: 'Send direct msgs here',
  })
  const [ownerStatus, setOwnerStatus] = useState<OwnerStatus>({
    is_online: true,
    last_active_at: new Date().toISOString(),
  })

  const [showVisitorModal, setShowVisitorModal] = useState<boolean>(false)
  const [pendingText, setPendingText] = useState<string>('')
  const [pendingMedia, setPendingMedia] = useState<string | undefined>(undefined)
  const [pendingMediaType, setPendingMediaType] = useState<'image' | 'video' | undefined>(undefined)
  const [showOwnerModal, setShowOwnerModal] = useState<boolean>(false)
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mockStoreRef = useRef<MockStore | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const supabaseTypingChannelRef = useRef<any>(null)

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
  }

  useEffect(() => {
    setVisitorName(MockStore.getVisitorName())
    setOwnerProfile(MockStore.getOwnerProfile())
    setOwnerStatus(MockStore.getOwnerStatus())

    const checkServerOwnerSession = async () => {
      try {
        const res = await fetch('/api/owner/verify')
        const data = await res.json()
        if (data.isOwner) {
          setIsOwnerMode(true)
        }
      } catch {
        setIsOwnerMode(MockStore.isOwner())
      }
    }
    checkServerOwnerSession()
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      const mockStore = new MockStore()
      mockStoreRef.current = mockStore
      setMessages(MockStore.getMessages())

      const cleanup = mockStore.onBroadcast((data) => {
        if (data.type === 'NEW_DIRECT_MESSAGE') {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.payload.id)) return prev
            return [...prev, data.payload]
          })
        } else if (data.type === 'OWNER_STATUS_UPDATE') {
          setOwnerStatus(data.payload)
        } else if (data.type === 'OWNER_PROFILE_UPDATE') {
          setOwnerProfile(data.payload)
        } else if (data.type === 'MESSAGES_UPDATE') {
          setMessages(data.payload)
        } else if (data.type === 'TYPING_EVENT') {
          if (data.payload.is_typing) {
            setTypingUser(data.payload.name)
          } else {
            setTypingUser(null)
          }
        }
      })

      return () => { cleanup() }
    } else {
      const client = supabase
      const fetchMessages = async () => {
        const { data } = await client.from('messages').select('*').order('created_at', { ascending: true })
        if (data) setMessages(data as DirectMessage[])
      }
      const fetchStatus = async () => {
        const { data } = await client.from('owner_presence').select('*').single()
        if (data) setOwnerStatus({ is_online: data.is_online, last_active_at: data.last_active_at })
      }
      const fetchProfile = async () => {
        const { data } = await client.from('owner_profile').select('*').single()
        if (data) {
          setOwnerProfile({
            name: data.name,
            bio: data.bio || '',
            avatarUrl: data.avatar_url,
            statusNote: data.status_note || '',
          })
        }
      }

      fetchMessages()
      fetchStatus()
      fetchProfile()

      const roomChannel = client
        .channel('direct-messaging-room')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const newMsg = payload.new as DirectMessage
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
          const updatedMsg = payload.new as DirectMessage
          setMessages((prev) => prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)))
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
          const deletedId = (payload.old as any)?.id
          if (deletedId) setMessages((prev) => prev.filter((m) => m.id !== deletedId))
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'owner_presence' }, (payload) => {
          const updated = payload.new
          setOwnerStatus({ is_online: updated.is_online, last_active_at: updated.last_active_at })
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'owner_profile' }, (payload) => {
          const updated = payload.new
          setOwnerProfile({
            name: updated.name,
            bio: updated.bio || '',
            avatarUrl: updated.avatar_url,
            statusNote: updated.status_note || '',
          })
        })
        .on('broadcast', { event: 'user-typing' }, (payload) => {
          if (payload.payload && payload.payload.name !== (isOwnerMode ? ownerProfile.name : visitorName)) {
            if (payload.payload.is_typing) {
              setTypingUser(payload.payload.name)
            } else {
              setTypingUser(null)
            }
          }
        })
        .subscribe()

      supabaseTypingChannelRef.current = roomChannel

      return () => { client.removeChannel(roomChannel) }
    }
  }, [isOwnerMode, ownerProfile.name, visitorName])

  // Mark Messages as Seen when viewing a conversation
  useEffect(() => {
    const markSeen = async () => {
      if (isOwnerMode && selectedVisitor !== 'ALL') {
        const unreadVisitorMsgs = messages.filter(
          (m) => m.sender_type === 'visitor' && m.sender_name.toLowerCase() === selectedVisitor.toLowerCase() && !m.seen
        )
        if (unreadVisitorMsgs.length > 0) {
          const updated = MockStore.markMessagesAsSeen(selectedVisitor, 'owner')
          setMessages(updated)
          if (isSupabaseConfigured && supabase) {
            await supabase
              .from('messages')
              .update({ seen: true, seen_at: new Date().toISOString() })
              .eq('sender_type', 'visitor')
              .eq('sender_name', selectedVisitor)
              .eq('seen', false)
          }
        }
      } else if (!isOwnerMode && visitorName) {
        const unreadOwnerMsgs = messages.filter(
          (m) => m.sender_type === 'owner' && (m.recipient_name?.toLowerCase() === visitorName.toLowerCase() || !m.recipient_name) && !m.seen
        )
        if (unreadOwnerMsgs.length > 0) {
          const updated = MockStore.markMessagesAsSeen(visitorName, 'visitor')
          setMessages(updated)
          if (isSupabaseConfigured && supabase) {
            await supabase
              .from('messages')
              .update({ seen: true, seen_at: new Date().toISOString() })
              .eq('sender_type', 'owner')
              .eq('seen', false)
          }
        }
      }
    }

    markSeen()
  }, [messages, selectedVisitor, isOwnerMode, visitorName])

  useEffect(() => { scrollToBottom() }, [messages, selectedVisitor, mobileOwnerView, typingUser])

  const conversations: ConversationSummary[] = MockStore.getConversations(messages)

  // ─── STRICT 1-ON-1 PRIVACY FILTER ───
  const displayedMessages = messages.filter((msg) => {
    // 1. OWNER MODE: Filter based on sidebar selection
    if (isOwnerMode) {
      if (selectedVisitor === 'ALL') return true
      if (msg.sender_type === 'visitor') return msg.sender_name.toLowerCase() === selectedVisitor.toLowerCase()
      if (msg.sender_type === 'owner') return (
        !msg.recipient_name ||
        msg.recipient_name === 'Me (Owner)' ||
        msg.recipient_name.toLowerCase() === selectedVisitor.toLowerCase()
      )
      return true
    }

    // 2. VISITOR MODE (Strict Privacy):
    if (!visitorName) {
      return msg.sender_type === 'owner' && (!msg.recipient_name || msg.recipient_name === 'Me (Owner)')
    }

    if (msg.sender_type === 'visitor') {
      return msg.sender_name.toLowerCase() === visitorName.toLowerCase()
    }

    if (msg.sender_type === 'owner') {
      return (
        !msg.recipient_name ||
        msg.recipient_name === 'Me (Owner)' ||
        msg.recipient_name.toLowerCase() === visitorName.toLowerCase()
      )
    }

    return false
  })

  // Current user name
  const currentUserName = isOwnerMode ? ownerProfile.name : visitorName

  // Handle Typing indicator event trigger
  const handleTyping = () => {
    if (!currentUserName) return

    // Broadcast typing true
    if (!isSupabaseConfigured || !supabase) {
      if (mockStoreRef.current) {
        mockStoreRef.current.sendBroadcast('TYPING_EVENT', { name: currentUserName, is_typing: true })
      }
    } else if (supabaseTypingChannelRef.current) {
      supabaseTypingChannelRef.current.send({
        type: 'broadcast',
        event: 'user-typing',
        payload: { name: currentUserName, is_typing: true }
      })
    }

    // Reset timer
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      if (!isSupabaseConfigured || !supabase) {
        if (mockStoreRef.current) {
          mockStoreRef.current.sendBroadcast('TYPING_EVENT', { name: currentUserName, is_typing: false })
        }
      } else if (supabaseTypingChannelRef.current) {
        supabaseTypingChannelRef.current.send({
          type: 'broadcast',
          event: 'user-typing',
          payload: { name: currentUserName, is_typing: false }
        })
      }
    }, 2000)
  }

  const handleInitiateSend = (text: string, mediaUrl?: string, mediaType?: 'image' | 'video') => {
    if (isOwnerMode) {
      executeSend(text, ownerProfile.name, 'owner', selectedVisitor === 'ALL' ? undefined : selectedVisitor, mediaUrl, mediaType)
      return
    }
    if (!visitorName) {
      setPendingText(text)
      setPendingMedia(mediaUrl)
      setPendingMediaType(mediaType)
      setShowVisitorModal(true)
    } else {
      executeSend(text, visitorName, 'visitor', ownerProfile.name, mediaUrl, mediaType)
    }
  }

  const handleSaveVisitorName = (name: string) => {
    MockStore.setVisitorName(name)
    setVisitorName(name)
    setShowVisitorModal(false)
    if (pendingText || pendingMedia) {
      executeSend(pendingText, name, 'visitor', ownerProfile.name, pendingMedia, pendingMediaType)
      setPendingText('')
      setPendingMedia(undefined)
      setPendingMediaType(undefined)
    }
  }

  const executeSend = async (
    content: string,
    senderName: string,
    senderType: 'visitor' | 'owner',
    recipientName?: string,
    mediaUrl?: string,
    mediaType?: 'image' | 'video'
  ) => {
    const newMsg: DirectMessage = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `msg-${Date.now()}`,
      sender_name: senderName,
      recipient_name: recipientName,
      sender_type: senderType,
      avatar_url: senderType === 'owner' ? ownerProfile.avatarUrl : `https://api.dicebear.com/7.x/bottts/svg?seed=${senderName}`,
      content,
      media_url: mediaUrl,
      media_type: mediaType || (mediaUrl ? 'image' : undefined),
      seen: false,
      created_at: new Date().toISOString(),
    }

    if (!isSupabaseConfigured || !supabase) {
      const updated = MockStore.addMessage(newMsg)
      setMessages(updated)
      if (mockStoreRef.current) mockStoreRef.current.sendBroadcast('NEW_DIRECT_MESSAGE', newMsg)
    } else {
      await supabase.from('messages').insert({
        id: newMsg.id,
        sender_name: newMsg.sender_name,
        recipient_name: newMsg.recipient_name,
        sender_type: newMsg.sender_type,
        avatar_url: newMsg.avatar_url,
        content: newMsg.content,
        media_url: newMsg.media_url,
        media_type: newMsg.media_type,
        seen: false,
      })
    }
  }

  const handleReact = async (messageId: string, emoji: string) => {
    if (!currentUserName) return

    const target = messages.find((m) => m.id === messageId)
    if (!target) return

    const currentReactions = { ...(target.reactions || {}) }
    const currentReactors = currentReactions[emoji] ? [...currentReactions[emoji]] : []
    const idx = currentReactors.indexOf(currentUserName)

    if (idx >= 0) {
      currentReactors.splice(idx, 1)
      if (currentReactors.length === 0) {
        delete currentReactions[emoji]
      } else {
        currentReactions[emoji] = currentReactors
      }
    } else {
      currentReactions[emoji] = [...currentReactors, currentUserName]
    }

    const updatedMessages = messages.map((m) =>
      m.id === messageId ? { ...m, reactions: currentReactions } : m
    )
    setMessages(updatedMessages)

    MockStore.toggleReaction(messageId, emoji, currentUserName)
    if (mockStoreRef.current) mockStoreRef.current.sendBroadcast('MESSAGES_UPDATE', updatedMessages)

    if (isSupabaseConfigured && supabase) {
      await supabase.from('messages').update({ reactions: currentReactions }).eq('id', messageId)
    }
  }

  const handleUnsend = async (messageId: string) => {
    const updatedMessages = messages.map((m) =>
      m.id === messageId ? { ...m, unsent: true, content: '', media_url: undefined, reactions: {} } : m
    )
    setMessages(updatedMessages)

    MockStore.unsendMessage(messageId)
    if (mockStoreRef.current) mockStoreRef.current.sendBroadcast('MESSAGES_UPDATE', updatedMessages)

    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('messages')
        .update({ unsent: true, content: '', media_url: null, reactions: {} })
        .eq('id', messageId)
    }
  }

  const handleOwnerLoginSuccess = () => {
    MockStore.setOwnerAuth(true)
    setIsOwnerMode(true)
    setShowOwnerModal(false)
    setMobileOwnerView('conversations')
    const updatedStatus = MockStore.updateOwnerStatus({ is_online: true, last_active_at: new Date().toISOString() })
    setOwnerStatus(updatedStatus)
    if (mockStoreRef.current) mockStoreRef.current.sendBroadcast('OWNER_STATUS_UPDATE', updatedStatus)
  }

  const handleOwnerLogout = async () => {
    try { await fetch('/api/owner/verify', { method: 'DELETE' }) } catch {}
    MockStore.setOwnerAuth(false)
    setIsOwnerMode(false)
    setSelectedVisitor('ALL')
  }

  const handleSaveProfile = async (updated: OwnerProfile) => {
    setOwnerProfile(updated)
    MockStore.updateOwnerProfile(updated)
    if (mockStoreRef.current) mockStoreRef.current.sendBroadcast('OWNER_PROFILE_UPDATE', updated)

    if (isSupabaseConfigured && supabase) {
      await supabase.from('owner_profile').upsert({
        id: 1,
        name: updated.name,
        bio: updated.bio,
        avatar_url: updated.avatarUrl,
        status_note: updated.statusNote,
      })
    }
  }

  return (
    <main className="h-screen flex flex-col max-w-6xl mx-auto p-2 sm:p-6 overflow-hidden">
      {/* Header */}
      <GoogleHeader
        ownerName={ownerProfile.name}
        ownerBio={ownerProfile.bio}
        ownerAvatarUrl={ownerProfile.avatarUrl}
        statusNote={ownerProfile.statusNote}
        isOnline={ownerStatus.is_online}
        lastActiveAt={ownerStatus.last_active_at}
        isOwnerMode={isOwnerMode}
        onToggleOwnerModal={() => isOwnerMode ? handleOwnerLogout() : setShowOwnerModal(true)}
        onOpenProfileModal={() => setShowProfileModal(true)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row gap-3 sm:gap-4 min-h-0 overflow-hidden">
        {/* Owner Sidebar */}
        {isOwnerMode && (
          <div className={`w-full md:w-72 h-full shrink-0 ${mobileOwnerView === 'conversations' ? 'flex' : 'hidden md:flex'}`}>
            <OwnerSidebar
              conversations={conversations}
              selectedVisitor={selectedVisitor}
              onSelectVisitor={(name) => {
                setSelectedVisitor(name)
                setMobileOwnerView('chat')
              }}
              totalMessagesCount={messages.length}
            />
          </div>
        )}

        {/* Chat / Message Container */}
        <div
          className={`flex-1 md-card flex flex-col min-h-0 overflow-hidden ${
            isOwnerMode && mobileOwnerView === 'conversations' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Mobile Owner Back Bar / Thread Banner */}
          {isOwnerMode && (
            <div className="flex items-center justify-between px-3.5 sm:px-6 py-2.5 border-b border-[#e8eaed] shrink-0 bg-[#f8fafb]">
              <div className="flex items-center gap-2">
                {/* Mobile Back button */}
                <button
                  onClick={() => {
                    setMobileOwnerView('conversations')
                    if (selectedVisitor !== 'ALL') setSelectedVisitor('ALL')
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#e8eaed] text-[#3c4043] text-xs font-medium hover:bg-[#dadce0] transition-colors md:hidden"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Conversations</span>
                </button>

                {/* Desktop Back button */}
                {selectedVisitor !== 'ALL' && (
                  <button
                    onClick={() => setSelectedVisitor('ALL')}
                    className="hidden md:flex items-center p-1.5 rounded-full hover:bg-[#f1f4f8] text-[#5f6368]"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}

                <div>
                  <h3 className="font-semibold text-xs sm:text-sm text-[#1f1f1f]">
                    {selectedVisitor === 'ALL' ? 'All Messages' : `Thread with ${selectedVisitor}`}
                  </h3>
                  <p className="text-[10px] text-[#9aa0a6]">
                    {selectedVisitor === 'ALL' ? 'Combined message stream' : 'Direct 1-on-1 Messages'}
                  </p>
                </div>
              </div>

              {selectedVisitor !== 'ALL' && (
                <button
                  onClick={() => {
                    setSelectedVisitor('ALL')
                    setMobileOwnerView('conversations')
                  }}
                  className="text-xs text-[#1a73e8] font-medium hover:underline"
                >
                  Show All
                </button>
              )}
            </div>
          )}

          {/* Visitor Info Banner */}
          {!isOwnerMode && visitorName && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#e8eaed] shrink-0 bg-[#f8fafb] text-xs text-[#5f6368]">
              <span className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full bg-[#1e8e3e]" />
                Direct 1-on-1 with <strong>{ownerProfile.name}</strong> as <strong className="text-[#1a73e8]">{visitorName}</strong>
              </span>
              <button
                onClick={() => setShowVisitorModal(true)}
                className="text-[11px] text-[#1a73e8] hover:underline shrink-0 ml-2"
              >
                Change Name
              </button>
            </div>
          )}

          {/* Messages — Scrollable Viewport */}
          {displayedMessages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-8 space-y-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#d3e3fd] text-[#1a73e8] flex items-center justify-center">
                <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-[#1f1f1f]">
                {isOwnerMode
                  ? selectedVisitor === 'ALL'
                    ? 'No messages yet'
                    : `No messages from ${selectedVisitor}`
                  : `Send ${ownerProfile.name} a direct message`}
              </h3>
              <p className="text-xs text-[#5f6368] max-w-xs leading-relaxed">
                {isOwnerMode
                  ? 'Select another conversation from the sidebar or wait for new messages.'
                  : "Your messages are private and only visible between you and " + ownerProfile.name + "."}
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4 scroll-smooth space-y-1">
              {displayedMessages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwnerView={isOwnerMode}
                  currentUserName={currentUserName}
                  onReact={handleReact}
                  onUnsend={handleUnsend}
                />
              ))}

              {/* Live Typing Indicator */}
              {typingUser && (
                <div className="flex items-center gap-2 my-2 animate-fade-in">
                  <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#f1f4f8] border border-[#e8eaed] text-[#5f6368]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1a73e8] animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1a73e8] animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1a73e8] animate-bounce" />
                    <span className="text-[11px] font-medium ml-1 text-[#3c4043]">{typingUser} is typing...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Input Box */}
          <div className="p-3 sm:px-6 sm:py-4 border-t border-[#e8eaed] shrink-0 bg-white">
            <MessageInput
              onSendMessage={handleInitiateSend}
              onTyping={handleTyping}
              placeholder={
                isOwnerMode
                  ? selectedVisitor !== 'ALL' ? `Replying to ${selectedVisitor}...` : `Replying as ${ownerProfile.name}...`
                  : visitorName ? `Message ${ownerProfile.name} as ${visitorName}...` : `Send ${ownerProfile.name} a private message...`
              }
            />
          </div>
        </div>
      </div>

      <div className="text-center text-[10px] sm:text-[11px] text-[#9aa0a6] py-1.5 sm:py-2 font-medium shrink-0">
        Direct Messaging Hub • Material Design
      </div>

      {showVisitorModal && <VisitorNameModal onSaveName={handleSaveVisitorName} onCancel={() => { setShowVisitorModal(false); setPendingText('') }} />}
      {showOwnerModal && <OwnerLoginModal onSuccess={handleOwnerLoginSuccess} onClose={() => setShowOwnerModal(false)} />}
      {showProfileModal && <OwnerProfileModal profile={ownerProfile} onSave={handleSaveProfile} onClose={() => setShowProfileModal(false)} />}
    </main>
  )
}
