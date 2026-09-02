-- Prompt Keeper schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).

-- Enable Row Level Security for a fresh start.
-- Each table is scoped to the signed-in user (user_id = auth.uid()).

-- ---------------------------------------------------------------------------
-- Prompts: a prompt text captured from an AI (with optional source reference)
-- ---------------------------------------------------------------------------
create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt_text text not null,
  notes text,
  ai_source text, -- 'chatgpt' | 'gemini' | 'grok' | 'other' | null
  source_url text, -- optional link to the reference image (e.g. Pinterest)
  created_at timestamptz not null default now()
);

alter table public.prompts enable row level security;

create policy "Users can read their own prompts"
  on public.prompts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own prompts"
  on public.prompts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own prompts"
  on public.prompts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own prompts"
  on public.prompts for delete
  using (auth.uid() = user_id);

create index if not exists prompts_user_created_idx
  on public.prompts (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Generated images: images attached to a prompt (your target / final image)
-- ---------------------------------------------------------------------------
create table if not exists public.generated_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt_id uuid references public.prompts(id) on delete cascade,
  storage_path text not null, -- path inside the 'images' bucket
  public_url text not null,   -- signed/authenticated URL to the stored file
  caption text,
  created_at timestamptz not null default now()
);

alter table public.generated_images enable row level security;

create policy "Users can read their own generated images"
  on public.generated_images for select
  using (auth.uid() = user_id);

create policy "Users can insert their own generated images"
  on public.generated_images for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own generated images"
  on public.generated_images for update
  using (auth.uid() = user_id);

create policy "Users can delete their own generated images"
  on public.generated_images for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage: 'images' bucket for uploaded images
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('images', 'images', false)
on conflict (id) do nothing;

-- Only the owner can read their own files.
-- File paths are stored as: <user_id>/<uuid>-<filename>
create policy "Users can read their own images"
  on storage.objects for select
  using (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can insert their own images"
  on storage.objects for insert
  with check (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own images"
  on storage.objects for update
  using (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own images"
  on storage.objects for delete
  using (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);
