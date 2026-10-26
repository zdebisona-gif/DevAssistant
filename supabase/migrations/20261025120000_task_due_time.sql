-- Optional due time for everyday tasks. Tasks can be due at a specific clock
-- time; reminders use it when set.
alter table public.tasks
add column due_time time;
