-- LifeMax OS — IdeaVault Database Setup
-- Run this in Supabase SQL editor after the original LifeMax setup SQL

-- Ideas table
create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null,
  category text not null default 'other',
  stage text not null default 'spark',
  description text,
  why_it_fits text,
  first_step text,
  revenue_potential text default 'medium',
  effort text default 'medium',
  capital_needed text default 'small',
  fits_year_one boolean default true,
  tags text[] default '{}',
  notes jsonb default '[]'::jsonb,
  analyses jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_reviewed_at timestamptz
);

-- Indexes
create index if not exists idx_ideas_user_stage on public.ideas (user_id, stage);
create index if not exists idx_ideas_user_updated on public.ideas (user_id, updated_at desc);

-- Row Level Security (single-user anon mode, matching existing LifeMax pattern)
alter table public.ideas enable row level security;

drop policy if exists "allow_anon_all_ideas" on public.ideas;
create policy "allow_anon_all_ideas"
  on public.ideas for all to anon
  using (true) with check (true);

-- Realtime
alter publication supabase_realtime add table public.ideas;

-- Rate limiting table for AI endpoints
create table if not exists public.rate_limits (
  user_id text not null,
  bucket text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (user_id, bucket, window_start)
);

-- Atomic increment RPC used by edge functions (analyze-idea, parse-voice).
-- Returns the new count for the (user_id, bucket, window_start) row.
create or replace function public.increment_rate_limit(
  p_user_id text,
  p_bucket text,
  p_window_start timestamptz
) returns int
language plpgsql
security definer
as $$
declare
  new_count int;
begin
  insert into public.rate_limits (user_id, bucket, window_start, count)
  values (p_user_id, p_bucket, p_window_start, 1)
  on conflict (user_id, bucket, window_start)
  do update set count = public.rate_limits.count + 1
  returning count into new_count;
  return new_count;
end;
$$;
