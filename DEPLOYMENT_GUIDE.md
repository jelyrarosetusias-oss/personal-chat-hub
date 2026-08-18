# 🚀 Complete Deployment Guide: GitHub, Supabase & Vercel

This guide provides step-by-step instructions to take your **Personal Direct Messaging Website** from your local machine to live production on the internet for free.

---

## 📋 Overview of Deployment Stack

| Component | Platform | Purpose | Cost |
| :--- | :--- | :--- | :--- |
| **Code Repository** | **GitHub** | Version control & automated deployments | Free |
| **Database & Realtime** | **Supabase** | PostgreSQL database, live chat sync | Free |
| **Web Hosting** | **Vercel** | Fast global hosting with Next.js support | Free |

---

## ─── STEP 1: Push Project to GitHub ───

### 1.1 Initialize Git in your project
Open your terminal in your project directory (`d:\chatApp`) and run:

```bash
git init
git add .
git commit -m "feat: complete personal direct messaging app with Material 3 design"
```

> **Note:** Verify that your `.gitignore` includes `.env*.local` and `node_modules` so your private keys are never exposed publicly.

---

### 1.2 Create a New GitHub Repository
1. Go to [github.com/new](https://github.com/new).
2. Set **Repository name** (e.g., `personal-chat-hub` or `direct-messages`).
3. Set visibility to **Public** or **Private** (both work).
4. Do **not** check "Add a README" or ".gitignore" (we already have them).
5. Click **Create repository**.

---

### 1.3 Link and Push Code to GitHub
Run the commands shown on GitHub:

```bash
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

---

## ─── STEP 2: Set Up Supabase (Database & Realtime) ───

### 2.1 Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and log in or create a free account.
2. Click **New Project**.
3. Choose an Organization.
4. Enter:
   - **Name**: `personal-chat-hub`
   - **Database Password**: Enter a strong password (save this securely).
   - **Region**: Choose the region closest to you (e.g., *Southeast Asia / Singapore*, *US East*, etc.).
5. Click **Create new project** and wait ~1 minute for setup to finish.

---

### 2.2 Run the SQL Schema
1. In your Supabase dashboard, click the **SQL Editor** icon (`>_`) in the left sidebar.
2. Click **New query**.
3. Copy and paste the entire script from `supabase/schema.sql` (also shown below):

```sql
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

-- 4. Enable Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE owner_presence;
```

4. Click **Run** (or press `Ctrl + Enter`). You should see `Success. No rows returned`.

---

### 2.3 Copy Your Supabase API Keys
1. In Supabase, go to **Project Settings** (gear icon at the bottom left) → **API**.
2. Copy the following two values:
   - **Project URL**: `https://xxxxxxxxxxxxxxxxxxxx.supabase.co`
   - **anon / public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6...`

---

## ─── STEP 3: Deploy to Vercel ───

### 3.1 Import GitHub Repo to Vercel
1. Go to [vercel.com](https://vercel.com) and log in with your GitHub account.
2. Click **Add New...** → **Project**.
3. Find your GitHub repository and click **Import**.

---

### 3.2 Add Environment Variables in Vercel
Before clicking Deploy, expand the **Environment Variables** section and add the following 3 variables:

| Key | Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJh...` | Your Supabase public anon key |
| `OWNER_PIN` | `1234` *(or your custom secret PIN)* | Secret numeric/alphanumeric PIN used to log in as Owner |

---

### 3.3 Click Deploy!
1. Click **Deploy**.
2. Vercel will build your Next.js application in about 45–60 seconds.
3. Once finished, click **Go to Dashboard** or click your live production URL (e.g., `https://your-chat-app.vercel.app`)! 🎉

---

## ─── STEP 4: How to Use Your Live Website ───

### 📱 For Visitors Reaching Out to You:
- Anyone who visits your live link (`https://your-chat-app.vercel.app`) sees your profile, online status pill, and can send you messages, emojis, and photo attachments without needing to create an account.
- They will simply enter their name on their first message.

### 👑 For You (Owner Mode):
1. Click **Owner Login** in the top-right corner of the header.
2. Enter your secret `OWNER_PIN` (set in Vercel Environment Variables).
3. Once authenticated:
   - Your sidebar opens up to view all visitor conversation threads.
   - You can click **Edit Profile** to update your display name, bio, and avatar.
   - Your replies appear in signature Google Blue bubbles.
   - Your status updates to **"Online now"** automatically.

---

## ─── STEP 5: (Optional) Connect a Custom Domain ───

If you own a custom domain (e.g., `chat.yourname.com` or `alex.me`):
1. In Vercel, go to **Settings** → **Domains**.
2. Enter your domain name and click **Add**.
3. Follow the DNS instructions (add a `CNAME` record in Namecheap, GoDaddy, Cloudflare, etc.).
4. Vercel provides free automatic SSL certificates (`https://`).

---

## 🛠️ Summary Checklist

- [ ] Project pushed to GitHub
- [ ] Supabase project created & `supabase/schema.sql` executed
- [ ] Realtime enabled on `messages` and `owner_presence`
- [ ] Vercel project imported from GitHub
- [ ] 3 Environment variables configured in Vercel (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OWNER_PIN`)
- [ ] Live site verified & Owner Login tested
