-- Priority tasks are pinned above other open work in the Planner.
alter table public.tasks
add column priority boolean not null default false;
