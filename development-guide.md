# Development Guide — Private Invite-Only Chat App

A step-by-step build guide for developers. Follow the phases in order — each phase depends on the previous one being working and tested.

**Stack:** Next.js + Tailwind CSS + Supabase (Postgres + Auth + Realtime) + Vercel

---

## Phase 0 — Prerequisites & Accounts

Before writing any code, get accounts and tools ready.

- [ ] Node.js 18+ installed (`node -v` to check)
- [ ] Git installed and a GitHub account
- [ ] [Supabase](https://supabase.com) account (free tier)
- [ ] [Vercel](https://vercel.com) account (free tier) — connect it to GitHub
- [ ] Code editor (VS Code recommended)
- [ ] Package manager: npm, pnpm, or yarn (pick one and stick with it)

**Deliverable:** All accounts created, Node installed, empty GitHub repo created.

---

## Phase 1 — Project Scaffolding

1. Create the Next.js app:
   ```bash
   npx create-next-app@latest private-chat --typescript --tailwind --app
   cd private-chat
   ```
2. Initialize git and push to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial scaffold"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
3. Connect the repo to Vercel (Import Project → select repo). Deploy once now, even with the default starter page, to confirm the pipeline works end-to-end.
4. Install Supabase client libraries:
   ```bash
   npm install @supabase/supabase-js @supabase/ssr
   ```

**Deliverable:** Default Next.js starter page live on a Vercel URL. Confirms your deploy pipeline works before you build real features on top of it.

---

## Phase 2 — Supabase Project Setup

1. Create a new project in the Supabase dashboard.
2. Note down (Settings → API):
   - `Project URL`
   - `anon public` key
3. Create a `.env.local` file in your Next.js project (never commit this file):
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Add `.env.local` to `.gitignore` (should already be there by default).
5. Create a Supabase client helper, e.g. `lib/supabase.ts`:
   ```ts
   import { createBrowserClient } from '@supabase/ssr'

   export const supabase = createBrowserClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
   )
   ```

**Deliverable:** Supabase project created, credentials wired into the Next.js app, no secrets committed to git.

---

## Phase 3 — Database Schema & Security

Run this in the Supabase SQL Editor.

```sql
-- Invitation codes
create table invites (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  is_used boolean default false,
  used_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Messages
create table messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  username text not null,
  content text not null,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table invites enable row level security;
alter table messages enable row level security;

-- Messages: only authenticated users can read
create policy "read messages if authenticated"
  on messages for select
  using (auth.role() = 'authenticated');

-- Messages: only authenticated users can insert their own messages
create policy "insert own messages"
  on messages for insert
  with check (auth.uid() = user_id);

-- Invites: only accessible via server-side logic (no direct client select)
create policy "no public read on invites"
  on invites for select
  using (false);
```

> ⚠️ Note the invites table has **no public select policy** — invite code validation must go through a server-side function (Phase 4), not a direct client query, so codes can't be enumerated or scraped.

Then seed exactly 10 invite codes:

```sql
insert into invites (code) values
('CODE-ALPHA'), ('CODE-BRAVO'), ('CODE-CHARLIE'), ('CODE-DELTA'), ('CODE-ECHO'),
('CODE-FOXTROT'), ('CODE-GOLF'), ('CODE-HOTEL'), ('CODE-INDIA'), ('CODE-JULIET');
```

Replace with real codes before sharing with your 10 users. Keep a private record of who received which code.

**Deliverable:** Tables created, RLS enabled and tested (try querying `invites` as an anon client — it should return nothing), 10 codes seeded.

---

## Phase 4 — Invite Code Validation (Server-Side)

Client-side code must never be able to read or guess valid invite codes. Use a Next.js Server Action or API Route with the **service role key** (kept server-only, never exposed to the browser).

1. Add the service role key to `.env.local` (server-only, do **not** prefix with `NEXT_PUBLIC_`):
   ```
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
2. Create `app/api/validate-invite/route.ts`:
   ```ts
   import { createClient } from '@supabase/supabase-js'
   import { NextResponse } from 'next/server'

   const supabaseAdmin = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY!
   )

   export async function POST(req: Request) {
     const { code } = await req.json()

     const { data, error } = await supabaseAdmin
       .from('invites')
       .select('*')
       .eq('code', code)
       .eq('is_used', false)
       .single()

     if (error || !data) {
       return NextResponse.json({ valid: false }, { status: 401 })
     }

     return NextResponse.json({ valid: true, inviteId: data.id })
   }
   ```
3. On success, sign the user in with Supabase Auth (anonymous sign-in is simplest for 10 known people) and mark the invite as used in a follow-up server call.

**Deliverable:** Entering a valid, unused code lets a user in and marks the code as used. Entering an invalid or already-used code is rejected. Test both paths.

---

## Phase 5 — Auth & Session Handling

1. On successful invite validation, call:
   ```ts
   const { data, error } = await supabase.auth.signInAnonymously()
   ```
2. Store the user's display name (ask for it once, right after code entry) alongside their `user_id`, either in a `profiles` table or directly on first message.
3. Protect the chat route: if there's no active session, redirect to the invite-code screen.
4. Add a simple sign-out option (optional, since this is a small trusted group).

**Deliverable:** Refreshing the page keeps the user logged in (session persists). Users without a valid session can't reach `/chat`.

---

## Phase 6 — Chat UI

Build in this order, testing each piece before moving to the next:

1. **Invite code screen** (`/`) — input field, submit button, error state for invalid codes.
2. **Display name screen** — shown once after first successful invite validation.
3. **Chat layout** (`/chat`) — message list (scrollable) + input box + send button.
4. **Message component** — sender name, timestamp, message content, visually distinct for "my messages" vs others.
5. **Empty state** — friendly message when no chats yet.
6. **Loading state** — skeleton or spinner while messages load initially.

Keep components small and split into files: `InviteForm.tsx`, `ChatWindow.tsx`, `MessageBubble.tsx`, `MessageInput.tsx`.

**Deliverable:** Full UI navigable end-to-end with mock/static data before wiring in real-time.

---

## Phase 7 — Real-Time Messaging

1. On chat mount, fetch existing messages (initial load):
   ```ts
   const { data } = await supabase
     .from('messages')
     .select('*')
     .order('created_at', { ascending: true })
   ```
2. Subscribe to new messages:
   ```ts
   supabase
     .channel('room-1')
     .on('postgres_changes',
       { event: 'INSERT', schema: 'public', table: 'messages' },
       (payload) => setMessages(prev => [...prev, payload.new])
     )
     .subscribe()
   ```
3. On send, insert into `messages` table (the subscription above will pick it up and render it — don't manually append to local state too, or messages will duplicate).
4. Unsubscribe from the channel on component unmount (`supabase.removeChannel(channel)`) to avoid memory leaks.

**Deliverable:** Open the app in two browser windows (or two devices), send a message in one, confirm it appears instantly in the other without a refresh.

---

## Phase 8 — Polish & Small-Group Niceties

Since this is just 10 people, these are cheap to add and go a long way:

- [ ] Typing indicator ("Alex is typing…") using Supabase Presence
- [ ] Online/offline status per user (also via Presence)
- [ ] Auto-scroll to latest message on new message arrival
- [ ] Message timestamps (relative, e.g. "2m ago")
- [ ] Basic input sanitization (trim whitespace, max message length, escape HTML)
- [ ] Mobile-responsive layout check

**Deliverable:** App feels alive and pleasant to use for a small trusted group.

---

## Phase 9 — Testing Checklist

Before sharing invite codes with real users, manually verify:

- [ ] Wrong invite code is rejected with a clear error
- [ ] Used invite code cannot be reused
- [ ] All 10 codes work exactly once each
- [ ] Messages sync in real time across 2+ simultaneous sessions
- [ ] Refreshing the page doesn't log the user out
- [ ] Unauthenticated visit to `/chat` redirects to invite screen
- [ ] No Supabase keys or secrets are visible in browser dev tools (only the anon key should ever appear client-side)
- [ ] App works on both desktop and mobile browsers

---

## Phase 10 — Deployment & Rollout

1. Push final code to `main` — Vercel auto-deploys.
2. Add all environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) to the Vercel project settings (Settings → Environment Variables), not just your local `.env.local`.
3. Do a final smoke test on the live Vercel URL (not just localhost).
4. Privately send each of the 10 people their unique invite code (e.g., via direct message, not a group channel where others could see it).
5. Monitor Supabase dashboard (Database → Table Editor, and Logs) for the first day to catch any issues early.

**Deliverable:** Live app, all 10 users successfully onboarded with their own codes.

---

## Suggested File Structure

```
private-chat/
├── app/
│   ├── page.tsx                # Invite code screen
│   ├── chat/
│   │   └── page.tsx            # Main chat screen
│   └── api/
│       └── validate-invite/
│           └── route.ts        # Server-side invite validation
├── components/
│   ├── InviteForm.tsx
│   ├── ChatWindow.tsx
│   ├── MessageBubble.tsx
│   └── MessageInput.tsx
├── lib/
│   └── supabase.ts             # Client helper
├── .env.local                  # Secrets (not committed)
└── package.json
```

---

## Common Pitfalls to Avoid

| Pitfall | Fix |
|---|---|
| Exposing the service role key to the browser | Only use it inside API routes / server actions, never in client components |
| Querying `invites` directly from the client | Always validate codes through the server-side API route |
| Duplicated messages after sending | Rely on the Realtime subscription to render sent messages, don't also append locally |
| Forgetting to add env vars in Vercel | App works locally but breaks in production — always mirror `.env.local` into Vercel settings |
| Not testing with 2+ simultaneous sessions | Real-time bugs often only show up with multiple concurrent users |

---

## Summary of Build Order

1. Scaffold & deploy skeleton
2. Set up Supabase + env vars
3. Create schema + RLS + seed invite codes
4. Build server-side invite validation
5. Wire up auth/session
6. Build chat UI (static first)
7. Add real-time messaging
8. Polish (typing indicators, presence, etc.)
9. Test thoroughly
10. Deploy and roll out codes to your 10 users
