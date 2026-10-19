-- Weekly projects (Phase 7): one-off deliverables with a deadline, assessed by Gemini
-- (or self-assessed) against a brief and success criteria.
--
-- A project that fails its assessment, or is manually marked missed, creates a row in
-- the penalty ledger: credits are forfeited and new projects stay locked until the user
-- writes an atonement note.

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000001',
  title text not null,
  brief text not null,
  criteria text,
  due_date date not null,
  due_time time,
  status text not null default 'active',
  submission_text text,
  submission_link text,
  submitted_at timestamptz,
  verdict text,
  assessment_feedback text,
  assessment_score integer,
  assessed_by text,
  assessed_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index projects_due_date_idx on public.projects (due_date);

create table public.project_penalties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default '00000000-0000-0000-0000-000000000001',
  project_id uuid references public.projects(id) on delete set null,
  project_title text not null,
  reason text not null,
  credits integer not null default 10,
  atonement text,
  atoned boolean not null default false,
  created_at timestamptz not null default now(),
  atoned_at timestamptz
);

create index project_penalties_created_at_idx on public.project_penalties (created_at desc);

alter table public.projects enable row level security;
alter table public.project_penalties enable row level security;

-- Dev-only: open access for the anon role, matching the other tables until Phase 3.
create policy dev_all on public.projects for all to anon using (true) with check (true);
create policy dev_all on public.project_penalties for all to anon using (true) with check (true);
grant select, insert, update, delete on public.projects to anon, authenticated;
grant select, insert, update, delete on public.project_penalties to anon, authenticated;
