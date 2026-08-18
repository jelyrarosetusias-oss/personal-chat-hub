export interface UserProfile {
  id: string
  short_id: string
  username: string
  display_name: string
  avatar_url: string
  bio?: string
  is_online?: boolean
  last_active_at?: string
  is_banned?: boolean
  is_admin?: boolean
  created_at?: string
}

export interface Conversation {
  id: string
  type: 'dm' | 'group'
  name?: string | null
  avatar_url?: string | null
  created_by?: string
  created_at: string
  members?: UserProfile[]
  unread_count?: number
  last_message?: MessageSummary | null
}

export interface MessageSummary {
  id: string
  content: string
  sender_id: string
  sender_name?: string
  media_url?: string
  media_type?: 'image' | 'video'
  created_at: string
  unsent?: boolean
}

export interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string
  sender_name?: string
  sender_avatar?: string
  content: string
  media_url?: string
  media_type?: 'image' | 'video'
  reactions?: Record<string, string[]> // emoji -> array of user_ids / user_names
  unsent?: boolean
  seen_by?: string[]
  created_at: string
}

export interface MessageRequest {
  id: string
  from_user_id: string
  to_user_id: string
  status: 'pending' | 'accepted' | 'declined'
  message?: string
  created_at: string
  from_user?: UserProfile
  to_user?: UserProfile
}
