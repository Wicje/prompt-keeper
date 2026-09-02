# Prompt Keeper

A small web app that stores the AI prompts you generate **and** the images that go with them, all in one searchable place. Built with **Next.js (App Router)** and **Supabase** (free tier).

It fits this workflow:

1. You give an AI (ChatGPT / Gemini / Grok) a reference image from Pinterest.
2. It returns a prompt for that image.
3. You capture the prompt + your reference + your final generated image into Prompt Keeper.
4. Later, you search your saved prompts/gallery to reuse them.

## How capturing works

Full auto-scraping of ChatGPT/Gemini is blocked by them, so this uses a **reliable semi-auto flow**: a **bookmarklet** that one-click pre-fills the form with whatever text you select.

- On ChatGPT/Gemini/Grok, **select the prompt text** with your mouse.
- Click your **"Capture prompt"** bookmark (installed once).
- A new tab opens with the prompt already filled in — add an image and hit **Save**.

You can also open `/add?prompt=YOUR_PROMPT` directly, or just use the form manually.

## Tech

- Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 4
- Supabase for Auth, Postgres, and Storage (images)
- Authentication: email + password (self-hosted sign-up/sign-in)

## Project structure

```
app/
  page.tsx            # Dashboard (recent prompts)
  add/page.tsx        # Capture form (+ ?prompt=&source=&ai= prefill for the bookmarklet)
  gallery/page.tsx    # Searchable gallery of every saved prompt+image
  login/page.tsx      # Sign in / sign up
  api/prompts/route.ts# Uploads images + saves prompt rows
lib/
  supabase/server.ts  # Server-side Supabase client (reads cookies)
  supabase/client.ts  # Browser Supabase client
  actions/auth.ts     # signUp / signIn / signOut
proxy.ts              # Session refresh (Next.js middleware replacement)
supabase/schema.sql   # Tables + storage policies (run this in Supabase)
```

## Setup

### 1. Create a Supabase project

Sign up at [supabase.com](https://supabase.com) (free tier works) and create a new project.

### 2. Run the schema

Open **SQL Editor** in Supabase, paste the entire contents of `supabase/schema.sql`, and run it.

This creates the `prompts` and `generated_images` tables, enables Row Level Security, and creates a private `images` storage bucket with per-user policies.

> On the free tier, the Supabase **auth email confirmation is enabled by default**. New sign-ups must confirm their email before signing in. You can disable it under **Authentication → Providers → Email → Confirm email** if you'd rather sign in instantly for personal use.

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your project's values (find them in Supabase under **Project Settings → API**):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://XXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

The anon key is safe for the browser; row-level security protects the data.

### 4. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000, create an account, and start capturing.

### 5. Install the bookmarklet

In the app, open the **Add page** (`/add`) — it shows a **"Copy the bookmarklet"** button.

1. Create a new bookmark in your browser and name it `Capture prompt`.
2. Paste the copied script into the bookmark's URL/address field.
3. On ChatGPT/Gemini/Grok, select the prompt text and click the bookmark.

## Deploying to Vercel (free)

1. Push this repo to GitHub.
2. On [vercel.com](https://vercel.com/new), **Import** the repo.
3. Add the two environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Deploy. Then update the bookmarklet's origin to your deployed URL (re-open `/add` on the live site and copy the updated bookmarklet).

## Security notes

- Row Level Security is enabled: a user can only read/write their own prompts and images.
- The images bucket is **private**; the app generates signed URLs for viewing.

## Data model

- `prompts` — id, user_id, prompt_text, notes, ai_source (chatgpt/gemini/grok/other), source_url (reference image), created_at
- `generated_images` — id, user_id, prompt_id, storage_path, public_url, caption, created_at
