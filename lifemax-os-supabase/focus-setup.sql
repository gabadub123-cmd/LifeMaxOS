-- ================================================================
-- LifeMax OS — Focus Sessions schema
-- Run in Supabase SQL Editor AFTER ideas-setup.sql
-- ================================================================

create table if not exists public.focus_sessions (
  id           uuid        primary key default gen_random_uuid(),
  user_id      text        not null,
  started_at   timestamptz not null,
  ended_at     timestamptz,
  duration_sec int,
  type         text        not null default 'work',  -- work | break
  task_label   text,
  source       text,                                 -- today-targets | ideas | schedule | manual
  interrupted  bool        not null default false,
  created_at   timestamptz not null default now()
);

alter table public.focus_sessions enable row level security;

drop policy if exists "allow_anon_all" on public.focus_sessions;
create policy "allow_anon_all"
  on public.focus_sessions
  for all
  to anon
  using (true)
  with check (true);

-- Enable realtime (safe if already member)
do $foc$
begin
  alter publication supabase_realtime add table public.focus_sessions;
exception when duplicate_object then null;
end $foc$;
