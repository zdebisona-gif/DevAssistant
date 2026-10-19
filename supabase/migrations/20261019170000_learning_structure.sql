-- Learning structure: courses → modules → lessons, with progress derived from lesson
-- completion. Replaces the flat course_units checklist (empty when this ran) and the
-- manual total_units / completed_units / next_label counters.

alter table public.courses
  add column description text not null default '',
  add column updated_at timestamptz not null default now();

drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

alter table public.courses
  drop column total_units,
  drop column completed_units,
  drop column next_label;

create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index course_modules_course_id_idx on public.course_modules (course_id);
create index course_modules_user_id_idx on public.course_modules (user_id);

create trigger course_modules_set_updated_at
before update on public.course_modules
for each row execute function public.set_updated_at();

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  title text not null,
  content text not null default '',
  position integer not null default 0,
  done boolean not null default false,
  opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lessons_module_id_idx on public.lessons (module_id);
create index lessons_user_id_idx on public.lessons (user_id);

create trigger lessons_set_updated_at
before update on public.lessons
for each row execute function public.set_updated_at();

alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;

create policy owner_all on public.course_modules
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy owner_all on public.lessons
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on table public.course_modules to authenticated;
grant select, insert, update, delete on table public.lessons to authenticated;

-- Optional link from a note to a course or a lesson.
alter table public.notes
  add column course_id uuid references public.courses(id) on delete set null,
  add column lesson_id uuid references public.lessons(id) on delete set null;
create index notes_course_id_idx on public.notes (course_id);
create index notes_lesson_id_idx on public.notes (lesson_id);

-- The flat units model is superseded by lessons.
drop table if exists public.course_units;

-- Keep the one-time legacy adoption shim valid now that course_units is gone.
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
  return new;
end;
$$;
