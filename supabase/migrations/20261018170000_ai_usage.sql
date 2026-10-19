-- AI usage ledger (Stage 1): enforces the free-tier daily request cap server-side.
-- Written only by the Edge Function via the service role; no anon access.

create table public.ai_usage (
  day date primary key,
  count integer not null default 0
);

alter table public.ai_usage enable row level security;
-- No policies: anon/authenticated cannot read or write. The service role bypasses RLS.

create or replace function public.bump_ai_usage(p_day date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  insert into public.ai_usage (day, count)
  values (p_day, 1)
  on conflict (day) do update set count = public.ai_usage.count + 1
  returning count into current_count;
  return current_count;
end;
$$;

revoke all on function public.bump_ai_usage(date) from public, anon, authenticated;
grant execute on function public.bump_ai_usage(date) to service_role;
