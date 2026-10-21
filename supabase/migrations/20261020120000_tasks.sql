-- Everyday tasks.
--
-- Tasks are a simple checklist that lives alongside the planner, but not inside the
-- calendar: they have an optional due date and a done flag, and never block a time slot.
-- Due dates are optional so "someday" tasks stay usable.

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  title text not null,
  tag text not null default 'Daily',
  due_date date,
  done boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_user_id_idx on public.tasks (user_id);
create index tasks_due_date_idx on public.tasks (user_id, due_date);

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;

create policy owner_all on public.tasks
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on table public.tasks to authenticated;

-- Keep the account reset complete now that tasks exist.
create or replace function public.delete_all_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  delete from public.lessons where user_id = uid;
  delete from public.course_modules where user_id = uid;
  delete from public.courses where user_id = uid;

  delete from public.project_penalties where user_id = uid;
  delete from public.projects where user_id = uid;

  delete from public.notes where user_id = uid;
  delete from public.transactions where user_id = uid;
  delete from public.budgets where user_id = uid;
  delete from public.study_sessions where user_id = uid;
  delete from public.planner_entries where user_id = uid;
  delete from public.tasks where user_id = uid;
  delete from public.accounts where user_id = uid;
  delete from public.debts where user_id = uid;
end;
$$;

revoke all on function public.delete_all_data() from public, anon;
grant execute on function public.delete_all_data() to authenticated;
