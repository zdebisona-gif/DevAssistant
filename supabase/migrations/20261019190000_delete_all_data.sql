-- Delete all data: one irreversible, account-scoped reset.
--
-- Removes every record the signed-in account owns, in a single transaction. Children are
-- deleted before parents; two foreign keys are `on delete set null` (transactions.account_id,
-- project_penalties.project_id) so those rows must be removed explicitly rather than relying
-- on a cascade.
--
-- Deliberately untouched: public.ai_usage (a global daily AI cap, not user data) and the auth
-- user itself, so the same account stays signed in after the reset.

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
  delete from public.accounts where user_id = uid;
  delete from public.debts where user_id = uid;
end;
$$;

-- Only a signed-in account may call it, and it can only ever touch its own rows.
revoke all on function public.delete_all_data() from public, anon;
grant execute on function public.delete_all_data() to authenticated;
