-- ============================================================
-- Chat App — Full Multi-User Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 0. Clean up old tables (from personal DM hub)
DROP TABLE IF EXISTS owner_presence CASCADE;
DROP TABLE IF EXISTS owner_profile CASCADE;
DROP TABLE IF EXISTS messages CASCADE;

-- ============================================================
-- 1. User Profiles
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id VARCHAR(6) NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT DEFAULT 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
  bio TEXT DEFAULT '',
  is_online BOOLEAN DEFAULT false,
  last_active_at TIMESTAMPTZ DEFAULT now(),
  is_banned BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_short_id ON profiles(short_id);
CREATE INDEX idx_profiles_username ON profiles(username);

-- ============================================================
-- 2. Conversations (DMs & Groups)
-- ============================================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('dm', 'group')),
  name TEXT,            -- NULL for DMs, group name for groups
  avatar_url TEXT,      -- Group avatar
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. Conversation Members
-- ============================================================
CREATE TABLE conversation_members (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX idx_conv_members_user ON conversation_members(user_id);

-- ============================================================
-- 4. Message Requests
-- ============================================================
CREATE TABLE message_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  message TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (from_user_id, to_user_id)
);

CREATE INDEX idx_requests_to ON message_requests(to_user_id, status);
CREATE INDEX idx_requests_from ON message_requests(from_user_id);

-- ============================================================
-- 5. Messages
-- ============================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL DEFAULT '',
  media_url TEXT,
  media_type TEXT DEFAULT 'image',
  reactions JSONB DEFAULT '{}'::jsonb,
  unsent BOOLEAN DEFAULT false,
  seen_by UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_conv ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- ============================================================
-- 7. Social Feed (Posts, Likes, Comments, Reposts)
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT,
  media_url TEXT,
  media_urls JSONB DEFAULT '[]',
  media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  repost_of_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comment_parent ON post_comments(parent_comment_id);

-- ============================================================
-- 8. Notifications (Likes, Comments, Replies, Reposts, Messages)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'reply', 'repost', 'message')),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  content_preview TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(recipient_id, is_read);

-- ============================================================
-- 9. Enable RLS
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Public read/write policies
CREATE POLICY "public_read_profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "public_update_profiles" ON profiles FOR UPDATE USING (true);
CREATE POLICY "public_insert_profiles" ON profiles FOR INSERT WITH CHECK (true);

CREATE POLICY "public_read_conversations" ON conversations FOR SELECT USING (true);
CREATE POLICY "public_insert_conversations" ON conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_conversations" ON conversations FOR UPDATE USING (true);
CREATE POLICY "public_delete_conversations" ON conversations FOR DELETE USING (true);

CREATE POLICY "public_read_members" ON conversation_members FOR SELECT USING (true);
CREATE POLICY "public_insert_members" ON conversation_members FOR INSERT WITH CHECK (true);
CREATE POLICY "public_delete_members" ON conversation_members FOR DELETE USING (true);

CREATE POLICY "public_read_requests" ON message_requests FOR SELECT USING (true);
CREATE POLICY "public_insert_requests" ON message_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_requests" ON message_requests FOR UPDATE USING (true);

CREATE POLICY "public_read_messages" ON messages FOR SELECT USING (true);
CREATE POLICY "public_insert_messages" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_messages" ON messages FOR UPDATE USING (true);
CREATE POLICY "public_delete_messages" ON messages FOR DELETE USING (true);

CREATE POLICY "public_read_posts" ON posts FOR SELECT USING (true);
CREATE POLICY "public_insert_posts" ON posts FOR INSERT WITH CHECK (true);
CREATE POLICY "public_delete_posts" ON posts FOR DELETE USING (true);

CREATE POLICY "public_read_likes" ON post_likes FOR SELECT USING (true);
CREATE POLICY "public_insert_likes" ON post_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "public_delete_likes" ON post_likes FOR DELETE USING (true);

CREATE POLICY "public_read_comments" ON post_comments FOR SELECT USING (true);
CREATE POLICY "public_insert_comments" ON post_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "public_delete_comments" ON post_comments FOR DELETE USING (true);

CREATE POLICY "public_read_notifications" ON notifications FOR SELECT USING (true);
CREATE POLICY "public_insert_notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_notifications" ON notifications FOR UPDATE USING (true);
CREATE POLICY "public_delete_notifications" ON notifications FOR DELETE USING (true);

-- ============================================================
-- 10. Enable Supabase Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_members;
ALTER PUBLICATION supabase_realtime ADD TABLE message_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE post_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
