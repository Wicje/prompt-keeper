-- Prompt Keeper schema
-- Run this in the Supabase SQL editor (or via the Management API).
-- Fully idempotent: safe to run multiple times.

-- ---------------------------------------------------------------------------
-- Prompts: a prompt text captured from an AI (with optional reference image)
-- ---------------------------------------------------------------------------
create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt_text text not null,
  notes text,
  ai_source text, -- 'chatgpt' | 'gemini' | 'grok' | 'other' | null
  source_url text, -- optional external link (e.g. Pinterest reference page)
  reference_storage_path text, -- uploaded reference image inside 'images' bucket
  reference_public_url text,   -- latest known URL for the reference image
  tags text[] not null default '{}',
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- keep updated_at fresh on edits
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists prompts_set_updated_at on public.prompts;
create trigger prompts_set_updated_at
  before update on public.prompts
  for each row execute function public.set_updated_at();

alter table public.prompts enable row level security;

drop policy if exists "Users can read their own prompts" on public.prompts;
create policy "Users can read their own prompts"
  on public.prompts for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own prompts" on public.prompts;
create policy "Users can insert their own prompts"
  on public.prompts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own prompts" on public.prompts;
create policy "Users can update their own prompts"
  on public.prompts for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own prompts" on public.prompts;
create policy "Users can delete their own prompts"
  on public.prompts for delete
  using (auth.uid() = user_id);

create index if not exists prompts_user_created_idx
  on public.prompts (user_id, created_at desc);

create index if not exists prompts_tags_idx
  on public.prompts using gin (tags);

-- ---------------------------------------------------------------------------
-- Generated images: images attached to a prompt (your target / final image)
-- ---------------------------------------------------------------------------
create table if not exists public.generated_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt_id uuid references public.prompts(id) on delete cascade,
  storage_path text not null, -- path inside the 'images' bucket
  public_url text not null,   -- last known (signed) URL; re-signed at render
  caption text,
  created_at timestamptz not null default now()
);

alter table public.generated_images enable row level security;

drop policy if exists "Users can read their own generated images" on public.generated_images;
create policy "Users can read their own generated images"
  on public.generated_images for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own generated images" on public.generated_images;
create policy "Users can insert their own generated images"
  on public.generated_images for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own generated images" on public.generated_images;
create policy "Users can update their own generated images"
  on public.generated_images for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own generated images" on public.generated_images;
create policy "Users can delete their own generated images"
  on public.generated_images for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage: 'images' bucket for uploaded images (reference + generated)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('images', 'images', false)
on conflict (id) do nothing;

-- Only the owner can read their own files.
-- File paths are stored as: <user_id>/<uuid>-<filename>
drop policy if exists "Users can read their own images" on storage.objects;
create policy "Users can read their own images"
  on storage.objects for select
  using (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can insert their own images" on storage.objects;
create policy "Users can insert their own images"
  on storage.objects for insert
  with check (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update their own images" on storage.objects;
create policy "Users can update their own images"
  on storage.objects for update
  using (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their own images" on storage.objects;
create policy "Users can delete their own images"
  on storage.objects for delete
  using (bucket_id = 'images' and (storage.foldername(name))[1] = auth.uid()::text);

-- Anon users must never reach the REST API for these tables; RLS already
-- blocks everything for anonymous (auth.uid() is null).
revoke all on public.prompts, public.generated_images from anon, authenticated;
grant select, insert, update, delete on public.prompts, public.generated_images to authenticated;

-- ---------------------------------------------------------------------------
-- API tokens: per-user tokens used for external captures (Chrome extension,
-- Custom GPT action, curl). Only the SHA-256 hash is stored; the plain token
-- is shown once when created / rotated.
-- ---------------------------------------------------------------------------
create table if not exists public.api_tokens (
  token_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.api_tokens enable row level security;

drop policy if exists "Users can manage their own api tokens" on public.api_tokens;
create policy "Users can manage their own api tokens"
  on public.api_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists api_tokens_user_idx on public.api_tokens (user_id);

revoke all on public.api_tokens from anon, authenticated;
grant select, insert, update, delete on public.api_tokens to authenticated;

-- ---------------------------------------------------------------------------
-- Telegram: maps a Telegram chat to a Prompt Keeper user.
-- ---------------------------------------------------------------------------
create table if not exists public.telegram_users (
  chat_id bigint primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.telegram_users enable row level security;

drop policy if exists "Users can manage their own telegram link" on public.telegram_users;
create policy "Users can manage their own telegram link"
  on public.telegram_users for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on public.telegram_users from anon, authenticated;
grant select, insert, update, delete on public.telegram_users to authenticated;

-- ---------------------------------------------------------------------------
-- Telegram link codes: short-lived codes that link a Telegram chat to the
-- web account (generated in the app, entered as /link <CODE> in Telegram).
-- ---------------------------------------------------------------------------
create table if not exists public.telegram_link_codes (
  code text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.telegram_link_codes enable row level security;

drop policy if exists "Users can manage their own telegram link codes" on public.telegram_link_codes;
create policy "Users can manage their own telegram link codes"
  on public.telegram_link_codes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists telegram_link_codes_user_idx
  on public.telegram_link_codes (user_id);

revoke all on public.telegram_link_codes from anon, authenticated;
grant select, insert, update, delete on public.telegram_link_codes to authenticated;