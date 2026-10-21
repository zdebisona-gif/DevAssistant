alter table public.sleep_logs
  add column notes jsonb not null default '[]'::jsonb
    check (jsonb_typeof(notes) = 'array'),
  add column daily_score smallint check (daily_score between 0 and 100),
  add column credit_points smallint not null default 0 check (credit_points between -5 and 5),
  add column score_breakdown jsonb,
  add column assessment_stale boolean not null default false;

update public.sleep_logs
set notes = jsonb_build_array(
  jsonb_build_object(
    'at', coalesce(assessed_at, updated_at, now()),
    'text', note
  )
)
where trim(note) <> '' and notes = '[]'::jsonb;

update public.sleep_logs
set credit_points = rating - 3
where rating is not null and credit_points = 0;

create table public.sleep_credit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  sleep_log_id uuid references public.sleep_logs(id) on delete set null,
  kind text not null check (kind in ('assessment', 'adjustment')),
  daily_score smallint check (daily_score between 0 and 100),
  points_before smallint not null default 0,
  points_after smallint not null default 0,
  delta smallint not null,
  created_at timestamptz not null default now()
);

create index sleep_credit_events_user_id_idx on public.sleep_credit_events (user_id);
create index sleep_credit_events_created_at_idx on public.sleep_credit_events (user_id, created_at desc);

alter table public.sleep_credit_events enable row level security;

create policy owner_read on public.sleep_credit_events
  for select to authenticated
  using (user_id = auth.uid());

grant select on table public.sleep_credit_events to authenticated;

insert into public.sleep_credit_events (
  user_id,
  sleep_log_id,
  kind,
  daily_score,
  points_before,
  points_after,
  delta,
  created_at
)
select
  user_id,
  id,
  'assessment',
  daily_score,
  0,
  credit_points,
  credit_points,
  coalesce(assessed_at, updated_at, now())
from public.sleep_logs
where rating is not null and credit_points <> 0;

create or replace function public.log_sleep_credit_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  before_points smallint := 0;
  after_points smallint := coalesce(new.credit_points, 0);
  event_kind text := 'assessment';
begin
  if tg_op = 'UPDATE' then
    before_points := coalesce(old.credit_points, 0);
    if old.rating is not null then
      event_kind := 'adjustment';
    end if;
  end if;

  if after_points = before_points then
    return new;
  end if;

  insert into public.sleep_credit_events (
    user_id,
    sleep_log_id,
    kind,
    daily_score,
    points_before,
    points_after,
    delta
  )
  values (
    new.user_id,
    new.id,
    event_kind,
    new.daily_score,
    before_points,
    after_points,
    after_points - before_points
  );

  return new;
end;
$$;

create trigger sleep_logs_credit_insert
after insert on public.sleep_logs
for each row execute function public.log_sleep_credit_change();

create trigger sleep_logs_credit_update
after update of credit_points on public.sleep_logs
for each row execute function public.log_sleep_credit_change();

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
  delete from public.sleep_credit_events where user_id = uid;
  delete from public.accounts where user_id = uid;
  delete from public.debts where user_id = uid;
end;
$$;

revoke all on function public.delete_all_data() from public, anon;
grant execute on function public.delete_all_data() to authenticated;
