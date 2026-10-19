-- Learning v2 (Phase 6): connect sessions to courses and capture a takeaway.
-- New columns inherit the existing table RLS policies and grants; no policy change needed.

alter table public.study_sessions
  add column course_id uuid references public.courses(id) on delete set null,
  add column takeaway text;

alter table public.courses
  add column weekly_target_hours numeric(4,1) not null default 0,
  add column active boolean not null default true;

create index study_sessions_course_id_idx on public.study_sessions (course_id);
