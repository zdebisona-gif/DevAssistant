-- Phase 3 (auth): every record belongs to the signed-in account.
--
-- Replaces the development-only anon policies with per-user ownership and makes
-- auth.uid() the default owner for new rows. The rows created before auth (owned
-- by the placeholder 00000000-0000-0000-0000-000000000001) are adopted by the
-- first account: the DO block covers an account created before this migration,
-- and the trigger covers the account created after it.
--
-- Keep public sign-ups disabled in the Supabase dashboard once the single account
-- exists; the adoption trigger becomes a no-op after the legacy rows move.

alter table public.budgets alter column user_id set default auth.uid();
alter table public.transactions alter column user_id set default auth.uid();
alter table public.notes alter column user_id set default auth.uid();
alter table public.courses alter column user_id set default auth.uid();
alter table public.course_units alter column user_id set default auth.uid();
alter table public.study_sessions alter column user_id set default auth.uid();
alter table public.planner_entries alter column user_id set default auth.uid();
alter table public.projects alter column user_id set default auth.uid();
alter table public.project_penalties alter column user_id set default auth.uid();

drop policy if exists dev_all on public.budgets;
revoke all on table public.budgets from anon, authenticated;
grant select, insert, update, delete on table public.budgets to authenticated;
create policy owner_all on public.budgets
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create index if not exists budgets_user_id_idx on public.budgets (user_id);

drop policy if exists dev_all on public.transactions;
revoke all on table public.transactions from anon, authenticated;
grant select, insert, update, delete on table public.transactions to authenticated;
create policy owner_all on public.transactions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create index if not exists transactions_user_id_idx on public.transactions (user_id);

drop policy if exists dev_all on public.notes;
revoke all on table public.notes from anon, authenticated;
grant select, insert, update, delete on table public.notes to authenticated;
create policy owner_all on public.notes
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create index if not exists notes_user_id_idx on public.notes (user_id);

drop policy if exists dev_all on public.courses;
revoke all on table public.courses from anon, authenticated;
grant select, insert, update, delete on table public.courses to authenticated;
create policy owner_all on public.courses
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create index if not exists courses_user_id_idx on public.courses (user_id);

drop policy if exists dev_all on public.course_units;
revoke all on table public.course_units from anon, authenticated;
grant select, insert, update, delete on table public.course_units to authenticated;
create policy owner_all on public.course_units
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create index if not exists course_units_user_id_idx on public.course_units (user_id);

drop policy if exists dev_all on public.study_sessions;
revoke all on table public.study_sessions from anon, authenticated;
grant select, insert, update, delete on table public.study_sessions to authenticated;
create policy owner_all on public.study_sessions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create index if not exists study_sessions_user_id_idx on public.study_sessions (user_id);

drop policy if exists dev_all on public.planner_entries;
revoke all on table public.planner_entries from anon, authenticated;
grant select, insert, update, delete on table public.planner_entries to authenticated;
create policy owner_all on public.planner_entries
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create index if not exists planner_entries_user_id_idx on public.planner_entries (user_id);

drop policy if exists dev_all on public.projects;
revoke all on table public.projects from anon, authenticated;
grant select, insert, update, delete on table public.projects to authenticated;
create policy owner_all on public.projects
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create index if not exists projects_user_id_idx on public.projects (user_id);

drop policy if exists dev_all on public.project_penalties;
revoke all on table public.project_penalties from anon, authenticated;
grant select, insert, update, delete on table public.project_penalties to authenticated;
create policy owner_all on public.project_penalties
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create index if not exists project_penalties_user_id_idx on public.project_penalties (user_id);

-- The usage ledger is service-role only.
revoke all on table public.ai_usage from anon, authenticated;

-- One-time legacy adoption for rows created before auth.
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
  update public.course_units set user_id = new.id where user_id = '00000000-0000-0000-0000-000000000001';
  update public.study_sessions set user_id = new.id where user_id = '00000000-0000-0000-0000-000000000001';
  update public.planner_entries set user_id = new.id where user_id = '00000000-0000-0000-0000-000000000001';
  update public.projects set user_id = new.id where user_id = '00000000-0000-0000-0000-000000000001';
  update public.project_penalties set user_id = new.id where user_id = '00000000-0000-0000-0000-000000000001';
  return new;
end;
$$;

revoke all on function public.adopt_legacy_records() from public, anon, authenticated;

drop trigger if exists adopt_legacy_records on auth.users;
create trigger adopt_legacy_records
after insert on auth.users
for each row execute function public.adopt_legacy_records();

-- Covers an account that already exists when this migration is applied.
do $$
declare
  uid uuid;
begin
  select id into uid from auth.users order by created_at asc limit 1;
  if uid is not null then
    update public.budgets set user_id = uid where user_id = '00000000-0000-0000-0000-000000000001';
    update public.transactions set user_id = uid where user_id = '00000000-0000-0000-0000-000000000001';
    update public.notes set user_id = uid where user_id = '00000000-0000-0000-0000-000000000001';
    update public.courses set user_id = uid where user_id = '00000000-0000-0000-0000-000000000001';
    update public.course_units set user_id = uid where user_id = '00000000-0000-0000-0000-000000000001';
    update public.study_sessions set user_id = uid where user_id = '00000000-0000-0000-0000-000000000001';
    update public.planner_entries set user_id = uid where user_id = '00000000-0000-0000-0000-000000000001';
    update public.projects set user_id = uid where user_id = '00000000-0000-0000-0000-000000000001';
    update public.project_penalties set user_id = uid where user_id = '00000000-0000-0000-0000-000000000001';
  end if;
end;
$$;
