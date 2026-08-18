export interface DirectMessage {
  id: string
  sender_name: string
  recipient_name?: string
  sender_type: 'visitor' | 'owner'
  avatar_url?: string
  content: string
  media_url?: string
  media_type?: 'image' | 'video'
  reactions?: Record<string, string[]> // emoji -> array of reactor names
  unsent?: boolean
  seen?: boolean
  seen_at?: string
  created_at: string
}

export interface OwnerStatus {
  is_online: boolean
  last_active_at: string
}

export interface OwnerProfile {
  name: string
  bio: string
  avatarUrl: string
  statusNote: string
}

export interface ConversationSummary {
  visitorName: string
  lastMessage: string
  lastTimestamp: string
  avatarUrl: string
  messageCount: number
  unreadCount: number
}

const STORAGE_KEY_MESSAGES = 'personal_chat_messages'
const STORAGE_KEY_VISITOR_NAME = 'personal_chat_visitor_name'
const STORAGE_KEY_OWNER_STATUS = 'personal_chat_owner_status'
const STORAGE_KEY_OWNER_AUTH = 'personal_chat_is_owner'
const STORAGE_KEY_OWNER_PROFILE = 'personal_chat_owner_profile'

export function formatLastActive(lastActiveISO: string, isOnline: boolean): string {
  if (isOnline) return 'Online now'

  try {
    const lastActive = new Date(lastActiveISO).getTime()
    const now = Date.now()
    const diffMs = Math.max(0, now - lastActive)
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 2) return 'Active just now'
    if (diffMins < 60) return `Active ${diffMins}m ago`
    if (diffHours < 24) return `Active ${diffHours}h ago`
    return `Active ${diffDays}d ago`
  } catch {
    return 'Offline'
  }
}

export class MockStore {
  private channel: BroadcastChannel | null = null

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('personal-chat-channel')
    }
  }

  static getVisitorName(): string {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem(STORAGE_KEY_VISITOR_NAME) || ''
  }

  static setVisitorName(name: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(STORAGE_KEY_VISITOR_NAME, name.trim())
  }

  static isOwner(): boolean {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(STORAGE_KEY_OWNER_AUTH) === 'true'
  }

  static setOwnerAuth(isOwner: boolean): void {
    if (typeof window === 'undefined') return
    if (isOwner) {
      localStorage.setItem(STORAGE_KEY_OWNER_AUTH, 'true')
    } else {
      localStorage.removeItem(STORAGE_KEY_OWNER_AUTH)
    }
  }

  static getOwnerProfile(): OwnerProfile {
    const defaultProfile: OwnerProfile = {
      name: 'Darskie',
      bio: 'Software Engineer',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=owner-dars',
      statusNote: 'Send direct msgs here'
    }

    if (typeof window === 'undefined') return defaultProfile

    const stored = localStorage.getItem(STORAGE_KEY_OWNER_PROFILE)
    if (!stored) {
      localStorage.setItem(STORAGE_KEY_OWNER_PROFILE, JSON.stringify(defaultProfile))
      return defaultProfile
    }
    try {
      return JSON.parse(stored)
    } catch {
      return defaultProfile
    }
  }

  static updateOwnerProfile(profile: Partial<OwnerProfile>): OwnerProfile {
    if (typeof window === 'undefined') {
      return {
        name: 'Darskie',
        bio: 'Software Engineer',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=owner-dars',
        statusNote: 'Send direct msgs here'
      }
    }
    const current = MockStore.getOwnerProfile()
    const updated: OwnerProfile = { ...current, ...profile }
    localStorage.setItem(STORAGE_KEY_OWNER_PROFILE, JSON.stringify(updated))
    return updated
  }

  static getOwnerStatus(): OwnerStatus {
    if (typeof window === 'undefined') {
      return { is_online: true, last_active_at: new Date().toISOString() }
    }
    const stored = localStorage.getItem(STORAGE_KEY_OWNER_STATUS)
    if (!stored) {
      const defaultStatus: OwnerStatus = {
        is_online: true,
        last_active_at: new Date().toISOString()
      }
      localStorage.setItem(STORAGE_KEY_OWNER_STATUS, JSON.stringify(defaultStatus))
      return defaultStatus
    }
    try {
      return JSON.parse(stored)
    } catch {
      return { is_online: true, last_active_at: new Date().toISOString() }
    }
  }

  static updateOwnerStatus(status: Partial<OwnerStatus>): OwnerStatus {
    if (typeof window === 'undefined') return { is_online: true, last_active_at: new Date().toISOString() }
    const current = MockStore.getOwnerStatus()
    const updated: OwnerStatus = { ...current, ...status }
    localStorage.setItem(STORAGE_KEY_OWNER_STATUS, JSON.stringify(updated))
    return updated
  }

  static getMessages(): DirectMessage[] {
    if (typeof window === 'undefined') return []
    const stored = localStorage.getItem(STORAGE_KEY_MESSAGES)
    if (!stored) {
      const defaultWelcome: DirectMessage[] = [
        {
          id: 'welcome-1',
          sender_name: 'Darskie (Owner)',
          sender_type: 'owner',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=owner-dars',
          content: "👋 Hi, I'm Dars. Feel free to drop me a message right here!",
          seen: true,
          created_at: new Date().toISOString()
        }
      ]
      localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(defaultWelcome))
      return defaultWelcome
    }
    try {
      return JSON.parse(stored)
    } catch {
      return []
    }
  }

  static addMessage(msg: DirectMessage): DirectMessage[] {
    if (typeof window === 'undefined') return []
    const current = MockStore.getMessages()
    const updated = [...current, msg]
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(updated))

    if (msg.sender_type === 'owner') {
      MockStore.updateOwnerStatus({ last_active_at: new Date().toISOString(), is_online: true })
    }

    return updated
  }

  static markMessagesAsSeen(visitorName: string, viewerType: 'owner' | 'visitor'): DirectMessage[] {
    if (typeof window === 'undefined') return []
    const messages = MockStore.getMessages()
    let changed = false

    const updated = messages.map((msg) => {
      if (viewerType === 'owner' && msg.sender_type === 'visitor' && msg.sender_name === visitorName && !msg.seen) {
        changed = true
        return { ...msg, seen: true, seen_at: new Date().toISOString() }
      }
      if (viewerType === 'visitor' && msg.sender_type === 'owner' && (msg.recipient_name === visitorName || !msg.recipient_name) && !msg.seen) {
        changed = true
        return { ...msg, seen: true, seen_at: new Date().toISOString() }
      }
      return msg
    })

    if (changed) {
      localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(updated))
    }
    return updated
  }

  static toggleReaction(messageId: string, emoji: string, reactorName: string): DirectMessage[] {
    if (typeof window === 'undefined') return []
    const messages = MockStore.getMessages()
    const msgIndex = messages.findIndex(m => m.id === messageId)
    if (msgIndex === -1) return messages

    const msg = { ...messages[msgIndex] }
    const reactions = { ...(msg.reactions || {}) }
    const currentReactors = reactions[emoji] ? [...reactions[emoji]] : []

    const reactorIndex = currentReactors.indexOf(reactorName)
    if (reactorIndex >= 0) {
      currentReactors.splice(reactorIndex, 1)
      if (currentReactors.length === 0) {
        delete reactions[emoji]
      } else {
        reactions[emoji] = currentReactors
      }
    } else {
      reactions[emoji] = [...currentReactors, reactorName]
    }

    msg.reactions = reactions
    messages[msgIndex] = msg
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages))
    return messages
  }

  static unsendMessage(messageId: string): DirectMessage[] {
    if (typeof window === 'undefined') return []
    const messages = MockStore.getMessages()
    const msgIndex = messages.findIndex(m => m.id === messageId)
    if (msgIndex === -1) return messages

    messages[msgIndex] = { ...messages[msgIndex], unsent: true, content: '', media_url: undefined, reactions: {} }
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages))
    return messages
  }

  static getConversations(messages: DirectMessage[]): ConversationSummary[] {
    const map = new Map<string, ConversationSummary>()

    messages.forEach((msg) => {
      let name = ''
      if (msg.sender_type === 'visitor') {
        name = msg.sender_name
      } else if (msg.recipient_name && !msg.recipient_name.includes('Owner')) {
        name = msg.recipient_name
      }

      if (!name) return

      const avatar = msg.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`
      const existing = map.get(name)

      let displayContent = msg.content
      if (msg.unsent) {
        displayContent = '⚠️ Message unsent'
      } else if (msg.media_url && !msg.content) {
        displayContent = msg.media_type === 'video' ? '🎥 [Video]' : '📷 [Photo]'
      }

      const isUnreadForOwner = msg.sender_type === 'visitor' && !msg.seen

      if (!existing) {
        map.set(name, {
          visitorName: name,
          lastMessage: displayContent,
          lastTimestamp: msg.created_at,
          avatarUrl: avatar,
          messageCount: 1,
          unreadCount: isUnreadForOwner ? 1 : 0
        })
      } else {
        existing.lastMessage = displayContent
        existing.lastTimestamp = msg.created_at
        existing.messageCount += 1
        if (isUnreadForOwner) existing.unreadCount += 1
      }
    })

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime()
    )
  }

  onBroadcast(callback: (event: { type: string; payload: any }) => void) {
    if (!this.channel) return () => {}
    const listener = (event: MessageEvent) => {
      callback(event.data)
    }
    this.channel.addEventListener('message', listener)
    return () => {
      this.channel?.removeEventListener('message', listener)
    }
  }

  sendBroadcast(type: string, payload: any) {
    if (this.channel) {
      this.channel.postMessage({ type, payload })
    }
  }
}
