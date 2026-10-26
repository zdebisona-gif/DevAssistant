-- Financial goals
--
-- Goals track savings targets against the user's income and expenses.
-- Progress is computed client-side from transactions, so no denormalised totals
-- are stored - the source of truth remains transactions/accounts/debts.

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null default '',
  target_amount numeric(12,2) not null check (target_amount > 0),
  due_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index goals_user_id_idx on public.goals (user_id);

create trigger goals_set_updated_at
before update on public.goals
for each row execute function public.set_updated_at();

alter table public.goals enable row level security;

create policy owner_all on public.goals
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on table public.goals to authenticated;
