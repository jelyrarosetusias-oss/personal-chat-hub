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
-- 6. Enable RLS
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (simplified for MVP — tighten for production)
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

-- ============================================================
-- 7. Enable Supabase Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_members;
ALTER PUBLICATION supabase_realtime ADD TABLE message_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
