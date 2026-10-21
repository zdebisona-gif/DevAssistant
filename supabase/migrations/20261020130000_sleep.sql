-- Sleep tracking.
--
-- One row per day. A day can hold several sleep sessions (for example a night sleep
-- plus a nap). The AI rates the whole day once, so the rating lives on this row rather
-- than on each individual session. Sessions are a small ordered JSON array:
-- [{"from":"23:00:00","to":"07:00:00"}]. Timestamped notes are added by the next
-- sleep-score migration.

create table public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  log_date date not null,
  sessions jsonb not null default '[]'::jsonb
    check (jsonb_typeof(sessions) = 'array' and jsonb_array_length(sessions) between 1 and 6),
  note text not null default '',
  rating smallint check (rating between 1 and 5),
  feedback text,
  assessed_by text,
  assessed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);
create index sleep_logs_user_id_idx on public.sleep_logs (user_id);
create index sleep_logs_log_date_idx on public.sleep_logs (user_id, log_date desc);

create trigger sleep_logs_set_updated_at
before update on public.sleep_logs
for each row execute function public.set_updated_at();

alter table public.sleep_logs enable row level security;

create policy owner_all on public.sleep_logs
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on table public.sleep_logs to authenticated;

-- Keep the account reset complete now that sleep logs exist.
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
  delete from public.sleep_logs where user_id = uid;
  delete from public.accounts where user_id = uid;
  delete from public.debts where user_id = uid;
end;
$$;

revoke all on function public.delete_all_data() from public, anon;
grant execute on function public.delete_all_data() to authenticated;
