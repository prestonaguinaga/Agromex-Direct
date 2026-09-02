-- ============================================================================
-- Monarch Admin · migration 0006 · realtime
-- Adds the shared tables to the supabase_realtime publication so every open
-- device receives row changes (Realtime honours RLS per subscriber).
-- REPLICA IDENTITY FULL lets filtered subscriptions see delete events.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'projects', 'project_members', 'estimates', 'estimate_sections', 'estimate_items',
    'estimate_item_options', 'budgets', 'budget_lines', 'task_lists', 'tasks',
    'notes', 'files', 'audit_log', 'memberships']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
    execute format('alter table public.%I replica identity full', t);
  end loop;
end $$;
