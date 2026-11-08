-- Per-user AI usage ledger.
--
-- The original public.ai_usage is global per UTC day. This table tracks the same
-- free-tier cap per user so one account cannot consume everyone's requests.
-- Written only by the Edge Function via the service role; no client access.

create table public.ai_usage_user (
  user_id uuid not null,
  day date not null,
  count integer not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage_user enable row level security;
-- No policies: anon/authenticated cannot read or write. The service role bypasses RLS.

revoke all on public.ai_usage_user from anon, authenticated;

-- Atomic insert-or-increment. Returns the post-increment count.
create or replace function public.bump_ai_usage_user(p_user uuid, p_day date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  insert into public.ai_usage_user (user_id, day, count)
  values (p_user, p_day, 1)
  on conflict (user_id, day) do update set count = public.ai_usage_user.count + 1
  returning count into current_count;
  return current_count;
end;
$$;

revoke all on function public.bump_ai_usage_user(uuid, date) from public, anon, authenticated;
grant execute on function public.bump_ai_usage_user(uuid, date) to service_role;

-- Give a request back when the upstream call fails. Never goes below zero.
create or replace function public.refund_ai_usage_user(p_user uuid, p_day date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ai_usage_user
     set count = greatest(count - 1, 0)
   where user_id = p_user and day = p_day;
end;
$$;

revoke all on function public.refund_ai_usage_user(uuid, date) from public, anon, authenticated;
grant execute on function public.refund_ai_usage_user(uuid, date) to service_role;

-- Rollback:
-- drop function if exists public.refund_ai_usage_user(uuid, date);
-- drop function if exists public.bump_ai_usage_user(uuid, date);
-- drop table if exists public.ai_usage_user;
