-- Optional card color for manual money accounts.
-- Null keeps the kind-based gradient, so existing accounts keep their current look.

alter table public.accounts
  add column color text;

comment on column public.accounts.color is
  'Optional card color key; null follows the account kind gradient.';
