# 💬 Personal Direct Messaging Hub

A modern, fast, and private **Direct Messaging Website** built with **Next.js 16 (App Router)**, **Supabase Realtime / PostgreSQL**, and **Google Material 3 Light Design System**.

Designed as a personal communication hub for individuals who have deactivated social media platforms (like Instagram, Facebook, TikTok) and want a clean, direct channel for friends and contacts to reach out.

---

## ✨ Features

- 🎨 **Google Material 3 Design**: Clean light surfaces, tonal pills, Google Sans typography, and signature Google Blue message bubbles.
- 🟢 **Live Online Status**: Tracks owner activity ("Online now", "Active 5m ago") with green pulse badge.
- ❤️ **Message Reactions**: Tap or hover on any bubble to react with `❤️`, `😂`, `👍`, `🔥`, `😮`, `😢`.
- ↩️ **Unsend Messages**: Senders can retract/unsend their messages anytime.
- 📎 **Photo Attachments**: Attach and preview images before sending with full-size lightbox viewer.
- 😀 **Native Emoji Keyboard**: Built-in categorized emoji picker (Smilies, Gestures, Hearts, Icons).
- 👑 **Secure Owner Mode**: Server-side PIN-authenticated owner dashboard with thread conversations sidebar and profile editor.
- ⚡ **Realtime Database**: Powered by Supabase Realtime with local fallback support.
- 📱 **Mobile & Desktop Responsive**: Viewport-bounded scrollable layout that fits every screen.

---

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/personal-direct-messaging.git
cd personal-direct-messaging
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup environment variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OWNER_PIN=1234
```

### 4. Run database setup
Execute `supabase/schema.sql` in your Supabase SQL Editor.

### 5. Start dev server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Deployment

See the complete step-by-step guide in [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) to deploy to **GitHub**, **Supabase**, and **Vercel** in under 5 minutes.

---

## 📄 License
MIT
