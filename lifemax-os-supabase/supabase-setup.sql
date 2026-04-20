-- ================================================================
-- LifeMax OS — Supabase schema
-- Copy ALL of this and paste into Supabase SQL Editor, then click RUN
-- ================================================================

-- Create the table
create table if not exists public.lifemax_data (
  user_id    text not null,
  key        text not null,
  value      jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- Enable Row Level Security
alter table public.lifemax_data enable row level security;

-- Policy: allow the anon key to read/write (single-user mode, no auth)
-- If you add login later, replace this with auth.uid()-based policies
drop policy if exists "allow_anon_all" on public.lifemax_data;
create policy "allow_anon_all"
  on public.lifemax_data
  for all
  to anon
  using (true)
  with check (true);

-- Enable realtime so other devices see changes instantly
alter publication supabase_realtime add table public.lifemax_data;
