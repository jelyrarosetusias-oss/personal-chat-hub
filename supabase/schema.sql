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

-- 3. Enable Row Level Security (RLS)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_presence ENABLE ROW LEVEL SECURITY;

-- Public read/insert/update policies
CREATE POLICY "public read messages" ON messages FOR SELECT USING (true);
CREATE POLICY "public read presence" ON owner_presence FOR SELECT USING (true);
CREATE POLICY "public insert messages" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "public update messages" ON messages FOR UPDATE USING (true);

-- Enable Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE owner_presence;
