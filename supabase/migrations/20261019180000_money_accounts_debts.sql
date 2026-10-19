-- Money accounts and debts.
--
-- Accounts are manual — there is no bank linking. A stored opening_balance plus the
-- signed amounts of the transactions tagged with account_id gives the live balance, so
-- logging "spent 100 on Jollibee using GCash" subtracts from that account automatically.
-- Debts are simple IOU rows: one direction, an amount, and a settle/delete lifecycle.

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  kind text not null default 'other' check (kind in ('gcash', 'bdo', 'cash', 'other')),
  opening_balance numeric(12,2) not null default 0,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index accounts_user_id_idx on public.accounts (user_id);

create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  counterparty text not null,
  direction text not null check (direction in ('owed_to_me', 'i_owe')),
  amount numeric(12,2) not null check (amount > 0),
  note text not null default '',
  due_date date,
  settled boolean not null default false,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index debts_user_id_idx on public.debts (user_id);

create trigger debts_set_updated_at
before update on public.debts
for each row execute function public.set_updated_at();

alter table public.accounts enable row level security;
alter table public.debts enable row level security;

create policy owner_all on public.accounts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy owner_all on public.debts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on table public.accounts to authenticated;
grant select, insert, update, delete on table public.debts to authenticated;

-- Tag a transaction to an account. Nullable, so legacy rows and untagged spending stay valid.
alter table public.transactions
  add column account_id uuid references public.accounts(id) on delete set null;
create index transactions_account_id_idx on public.transactions (account_id);

-- Keep the one-time legacy adoption shim valid now that accounts and debts exist.
create or replace function public.adopt_legacy_records()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.budgets set user_id = new.id where user_id = '00000000-0000-0000-0000-000000000001';
  update public.transactions set user_id = new.id where user_id = '00000000-0000-0000-0000-000000000001';
  update public.notes set user_id = new.id where user_id = '00000000-0000-0000-0000-000000000001';
  update public.courses set user_id = new.id where user_id = '00000000-0000-0000-0000-000000000001';
  update public.study_sessions set user_id = new.id where user_id = '00000000-0000-0000-0000-000000000001';
  update public.planner_entries set user_id = new.id where user_id = '00000000-0000-0000-0000-000000000001';
  update public.projects set user_id = new.id where user_id = '00000000-0000-0000-0000-000000000001';
  update public.project_penalties set user_id = new.id where user_id = '00000000-0000-0000-0000-000000000001';
  update public.accounts set user_id = new.id where user_id = '00000000-0000-0000-0000-000000000001';
  update public.debts set user_id = new.id where user_id = '00000000-0000-0000-0000-000000000001';
  return new;
end;
$$;
