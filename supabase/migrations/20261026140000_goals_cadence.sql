-- Add cadence for goal advice
alter table public.goals
  add column if not exists target_cadence text not null default 'monthly'
  check (target_cadence in ('daily','weekly','monthly'));
