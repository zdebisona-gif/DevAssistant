-- Zen-I Assistant initial schema (Phase 2)
-- Dev posture: RLS enabled with permissive anon policies. Replaced in Phase 3 when auth lands.

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000001',
  category text not null,
  limit_amount numeric(12,2) not null,
  period date not null default date_trunc('month', now())::date,
  created_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000001',
  occurred_on date not null,
  merchant text not null,
  category text not null,
  account text,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);
create index transactions_occurred_on_idx on public.transactions (occurred_on);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000001',
  title text not null,
  body text not null default '',
  tag text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger notes_set_updated_at
before update on public.notes
for each row execute function public.set_updated_at();

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000001',
  name text not null,
  total_units integer not null default 0,
  completed_units integer not null default 0,
  next_label text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000001',
  studied_on date not null,
  hours numeric(4,1) not null default 0,
  created_at timestamptz not null default now()
);
create index study_sessions_studied_on_idx on public.study_sessions (studied_on);

create table public.planner_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000001',
  entry_date date not null,
  start_time time,
  title text not null,
  tag text,
  kind text,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index planner_entries_entry_date_idx on public.planner_entries (entry_date);

alter table public.budgets enable row level security;
alter table public.transactions enable row level security;
alter table public.notes enable row level security;
alter table public.courses enable row level security;
alter table public.study_sessions enable row level security;
alter table public.planner_entries enable row level security;

-- Dev-only: open access for the anon role. Do not ship; replaced in Phase 3.
create policy dev_all on public.budgets for all to anon using (true) with check (true);
create policy dev_all on public.transactions for all to anon using (true) with check (true);
create policy dev_all on public.notes for all to anon using (true) with check (true);
create policy dev_all on public.courses for all to anon using (true) with check (true);
create policy dev_all on public.study_sessions for all to anon using (true) with check (true);
create policy dev_all on public.planner_entries for all to anon using (true) with check (true);

grant select, insert, update, delete on public.budgets to anon, authenticated;
grant select, insert, update, delete on public.transactions to anon, authenticated;
grant select, insert, update, delete on public.notes to anon, authenticated;
grant select, insert, update, delete on public.courses to anon, authenticated;
grant select, insert, update, delete on public.study_sessions to anon, authenticated;
grant select, insert, update, delete on public.planner_entries to anon, authenticated;
