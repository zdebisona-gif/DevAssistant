alter table public.planner_entries
  add column if not exists priority boolean not null default false;
