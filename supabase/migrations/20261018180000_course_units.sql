-- Course units (Stage 2.5): AI-proposed and hand-added units per course.
-- Completing a unit advances the course's completed_units rollup; no study session is logged.

create table public.course_units (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000001',
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index course_units_course_id_idx on public.course_units (course_id);

alter table public.course_units enable row level security;

-- Dev-only: open access for the anon role, matching the other tables until Phase 3.
create policy dev_all on public.course_units for all to anon using (true) with check (true);
grant select, insert, update, delete on public.course_units to anon, authenticated;
