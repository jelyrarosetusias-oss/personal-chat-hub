-- Personal Direct Messaging Website Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

-- 1. Direct Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_name TEXT NOT NULL,
  recipient_name TEXT,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('visitor', 'owner')),
  avatar_url TEXT,
  content TEXT NOT NULL DEFAULT '',
  media_url TEXT,
  reactions JSONB DEFAULT '{}'::jsonb,
  unsent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Owner Presence / Status Table
CREATE TABLE IF NOT EXISTS owner_presence (
  id INT PRIMARY KEY DEFAULT 1,
  is_online BOOLEAN DEFAULT true,
  last_active_at TIMESTAMPTZ DEFAULT now()
);

-- Initialize default presence row
INSERT INTO owner_presence (id, is_online, last_active_at)
VALUES (1, true, now())
ON CONFLICT (id) DO NOTHING;

-- 3. Owner Public Profile Table (Syncs across all devices & incognito)
CREATE TABLE IF NOT EXISTS owner_profile (
  id INT PRIMARY KEY DEFAULT 1,
  name TEXT NOT NULL DEFAULT 'Darskie',
  bio TEXT DEFAULT 'Software Engineer',
  avatar_url TEXT DEFAULT 'https://api.dicebear.com/7.x/avataaars/svg?seed=owner-dars',
  status_note TEXT DEFAULT 'Send direct msgs here'
);

-- Initialize default profile row
INSERT INTO owner_profile (id, name, bio, avatar_url, status_note)
VALUES (1, 'Darskie', 'Software Engineer', 'https://api.dicebear.com/7.x/avataaars/svg?seed=owner-dars', 'Send direct msgs here')
ON CONFLICT (id) DO NOTHING;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_profile ENABLE ROW LEVEL SECURITY;

-- Public read/insert/update policies
CREATE POLICY "public read messages" ON messages FOR SELECT USING (true);
CREATE POLICY "public read presence" ON owner_presence FOR SELECT USING (true);
CREATE POLICY "public read profile" ON owner_profile FOR SELECT USING (true);

CREATE POLICY "public insert messages" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "public update messages" ON messages FOR UPDATE USING (true);
CREATE POLICY "public update presence" ON owner_presence FOR UPDATE USING (true);
CREATE POLICY "public update profile" ON owner_profile FOR UPDATE USING (true);
CREATE POLICY "public insert profile" ON owner_profile FOR INSERT WITH CHECK (true);

-- 5. Enable Supabase Realtime for instant multi-device syncing
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE owner_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE owner_profile;
