-- ============================================================================
-- Monarch Admin · migration 0004 · audit / activity history
-- Field-level old → new capture by trigger, with a human-readable summary
-- rendered at write time, e.g.
--   "Budget for Electrical changed from $26,000.00 to $28,500.00"
-- The UI appends "by <actor> on <date>" from the actor_name / created_at columns.
-- ============================================================================

create table public.audit_log (
  id           bigserial primary key,
  company_id   uuid not null references public.companies (id) on delete cascade,
  project_id   uuid,
  actor_id     uuid,
  actor_name   text,
  entity_type  text not null,
  entity_id    uuid,
  action       text not null check (action in ('insert', 'update', 'delete', 'event')),
  field        text,
  old_value    jsonb,
  new_value    jsonb,
  summary      text not null,
  source       text not null default 'ui',
  created_at   timestamptz not null default now()
);
create index audit_log_project_idx on public.audit_log (project_id, created_at desc);
create index audit_log_company_idx on public.audit_log (company_id, created_at desc);

-- ----------------------------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------------------------
create or replace function audit.money(v jsonb) returns text
language sql immutable as $$
  select case
    when v is null or jsonb_typeof(v) = 'null' then '—'
    else '$' || to_char((v #>> '{}')::numeric, 'FM999,999,999,990.00')
  end
$$;

create or replace function audit.scalar(v jsonb) returns text
language sql immutable as $$
  select case
    when v is null or jsonb_typeof(v) = 'null' then '—'
    when jsonb_typeof(v) = 'string' then v #>> '{}'
    else v::text
  end
$$;

create or replace function audit.actor_name() returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(p.full_name, ''), p.email)
  from public.profiles p where p.id = auth.uid()
$$;

create or replace function audit.profile_name(uid uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(p.full_name, ''), p.email, '—')
  from public.profiles p where p.id = uid
$$;

create or replace function audit.project_of(tbl text, row_data jsonb) returns uuid
language sql stable security definer set search_path = '' as $$
  select case
    when tbl = 'projects' then (row_data->>'id')::uuid
    when row_data ? 'project_id' then (row_data->>'project_id')::uuid
    when row_data ? 'estimate_id' then
      (select e.project_id from public.estimates e where e.id = (row_data->>'estimate_id')::uuid)
    else null
  end
$$;

create or replace function audit.item_name(item uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(i.name, ''), 'item') from public.estimate_items i where i.id = item
$$;

-- The sentence for one change. Kept deliberately plain-English.
create or replace function audit.summarise(
  tbl text, action text, field text, oldv jsonb, newv jsonb, row_data jsonb
) returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  label text := coalesce(nullif(row_data->>'name', ''), nullif(row_data->>'title', ''),
                         nullif(row_data->>'category', ''), nullif(row_data->>'label', ''));
  entity text := case tbl
    when 'projects' then 'project'
    when 'estimates' then 'estimate'
    when 'estimate_sections' then 'section'
    when 'estimate_items' then 'line item'
    when 'estimate_item_options' then 'product option'
    when 'budgets' then 'budget'
    when 'budget_lines' then 'budget line'
    when 'task_lists' then 'checklist'
    when 'tasks' then 'task'
    when 'notes' then 'note'
    when 'files' then coalesce(row_data->>'kind', 'file')
    when 'memberships' then 'team member'
    when 'project_members' then 'project assignment'
    when 'role_permissions' then 'permission'
    else replace(tbl, '_', ' ') end;
  money_fields text[] := array['budgeted', 'committed', 'actual', 'unit_price'];
begin
  if action = 'insert' then
    return case tbl
      when 'notes' then 'Added a note: "' || left(coalesce(row_data->>'body', ''), 80)
                        || case when length(coalesce(row_data->>'body', '')) > 80 then '…"' else '"' end
      when 'files' then 'Uploaded ' || entity || ' "' || coalesce(row_data->>'name', '') || '"'
      when 'memberships' then 'Added ' || audit.profile_name((row_data->>'user_id')::uuid)
                              || ' to the team as ' || replace(coalesce(row_data->>'role', ''), '_', ' ')
      when 'project_members' then 'Assigned ' || audit.profile_name((row_data->>'user_id')::uuid) || ' to the project'
      when 'projects' then 'Created project "' || coalesce(label, '') || '"'
      when 'tasks' then 'Added task "' || coalesce(label, '') || '"'
      when 'budget_lines' then 'Added budget line "' || coalesce(label, '') || '" at '
                               || audit.money(row_data->'budgeted')
      else 'Added ' || entity || case when label is not null then ' "' || label || '"' else '' end
    end;
  elsif action = 'delete' then
    return case tbl
      when 'notes' then 'Deleted a note'
      when 'files' then 'Deleted ' || entity || ' "' || coalesce(row_data->>'name', '') || '"'
      when 'project_members' then 'Removed ' || audit.profile_name((row_data->>'user_id')::uuid) || ' from the project'
      else 'Removed ' || entity || case when label is not null then ' "' || label || '"' else '' end
    end;
  end if;

  -- updates
  if tbl = 'budget_lines' and field = any (money_fields) then
    return format('Budget for %s (%s) changed from %s to %s',
                  coalesce(label, 'line'), field, audit.money(oldv), audit.money(newv));
  elsif tbl = 'estimate_item_options' and field = 'unit_price' then
    return format('Price for "%s" changed from %s to %s',
                  audit.item_name((row_data->>'item_id')::uuid), audit.money(oldv), audit.money(newv));
  elsif tbl = 'estimate_item_options' and field = 'url' then
    return format('Product link for "%s" updated', audit.item_name((row_data->>'item_id')::uuid));
  elsif tbl = 'estimate_item_options' and field = 'label' then
    return format('Option for "%s" renamed to "%s"', audit.item_name((row_data->>'item_id')::uuid), audit.scalar(newv));
  elsif tbl = 'estimate_items' and field = 'done' then
    return case when (newv #>> '{}')::boolean then 'Checked off "' || coalesce(label, '') || '"'
                else 'Unchecked "' || coalesce(label, '') || '"' end;
  elsif tbl = 'estimate_items' and field = 'qty' then
    return format('Quantity for "%s" changed from %s to %s %s',
                  coalesce(label, ''), audit.scalar(oldv), audit.scalar(newv), coalesce(row_data->>'unit', ''));
  elsif tbl = 'estimate_items' and field = 'active_option_id' then
    return format('Selected a different product option for "%s"', coalesce(label, ''));
  elsif tbl = 'tasks' and field = 'status' then
    return case audit.scalar(newv)
      when 'done' then 'Completed task "' || coalesce(label, '') || '"'
      when 'todo' then 'Reopened task "' || coalesce(label, '') || '"'
      else format('Task "%s" is now %s', coalesce(label, ''), replace(audit.scalar(newv), '_', ' ')) end;
  elsif tbl = 'tasks' and field = 'assignee_id' then
    return format('Task "%s" assigned to %s', coalesce(label, ''),
                  case when newv is null or jsonb_typeof(newv) = 'null' then 'nobody'
                       else audit.profile_name((newv #>> '{}')::uuid) end);
  elsif tbl = 'tasks' and field = 'due_date' then
    return format('Due date for "%s" changed from %s to %s', coalesce(label, ''), audit.scalar(oldv), audit.scalar(newv));
  elsif tbl = 'memberships' and field = 'role' then
    return format('Changed role of %s from %s to %s', audit.profile_name((row_data->>'user_id')::uuid),
                  replace(audit.scalar(oldv), '_', ' '), replace(audit.scalar(newv), '_', ' '));
  elsif tbl = 'memberships' and field = 'is_active' then
    return case when (newv #>> '{}')::boolean
      then 'Reactivated ' || audit.profile_name((row_data->>'user_id')::uuid)
      else 'Deactivated ' || audit.profile_name((row_data->>'user_id')::uuid) end;
  elsif tbl = 'role_permissions' then
    return format('%s %s for %s', case when (newv #>> '{}')::boolean then 'Granted' else 'Revoked' end,
                  row_data->>'capability', replace(coalesce(row_data->>'role', ''), '_', ' '));
  elsif tbl = 'projects' then
    return format('Project %s changed from "%s" to "%s"', replace(field, '_', ' '),
                  audit.scalar(oldv), audit.scalar(newv));
  elsif tbl = 'estimates' and field like '%_pct' then
    return format('Estimate %s changed from %s%% to %s%%', replace(replace(field, '_pct', ''), '_', ' '),
                  audit.scalar(oldv), audit.scalar(newv));
  elsif field = any (money_fields) then
    return format('%s %s changed from %s to %s', initcap(entity), field, audit.money(oldv), audit.money(newv));
  end if;
  return format('%s%s %s changed from "%s" to "%s"', initcap(entity),
                case when label is not null then ' "' || label || '"' else '' end,
                replace(field, '_', ' '), audit.scalar(oldv), audit.scalar(newv));
end $$;

-- ----------------------------------------------------------------------------
-- The trigger. Pass the columns worth logging as trigger arguments.
-- ----------------------------------------------------------------------------
create or replace function audit.row_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  col      text;
  oldj     jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  newj     jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  rowj     jsonb := coalesce(newj, oldj);
  cid      uuid := (rowj->>'company_id')::uuid;
  pid      uuid := audit.project_of(tg_table_name, rowj);
  actor    uuid := auth.uid();
  aname    text := audit.actor_name();
  src      text := coalesce(nullif(current_setting('app.source', true), ''), 'ui');
begin
  if tg_op = 'UPDATE' then
    foreach col in array tg_argv loop
      if oldj->col is distinct from newj->col then
        insert into public.audit_log
          (company_id, project_id, actor_id, actor_name, entity_type, entity_id,
           action, field, old_value, new_value, summary, source)
        values
          (cid, pid, actor, aname, tg_table_name, (rowj->>'id')::uuid,
           'update', col, oldj->col, newj->col,
           audit.summarise(tg_table_name, 'update', col, oldj->col, newj->col, newj), src);
      end if;
    end loop;
  else
    insert into public.audit_log
      (company_id, project_id, actor_id, actor_name, entity_type, entity_id,
       action, old_value, new_value, summary, source)
    values
      (cid, pid, actor, aname, tg_table_name, (rowj->>'id')::uuid,
       lower(tg_op),
       case when tg_op = 'DELETE' then oldj end,
       case when tg_op = 'INSERT' then newj end,
       audit.summarise(tg_table_name, lower(tg_op), null, null, null, rowj), src);
  end if;
  return null;
end $$;

-- App-level events (Bob, imports, system) — checked against the caller's scope.
create or replace function public.log_activity(
  p_project_id uuid, p_entity_type text, p_entity_id uuid, p_summary text, p_source text default 'ui'
) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  cid uuid;
  new_id bigint;
begin
  if p_project_id is not null then
    if not authz.on_project(p_project_id) then
      raise exception 'Project not accessible' using errcode = '42501';
    end if;
    select company_id into cid from public.projects where id = p_project_id;
  else
    cid := authz.my_company();
  end if;
  if cid is null then raise exception 'No company' using errcode = '42501'; end if;
  insert into public.audit_log
    (company_id, project_id, actor_id, actor_name, entity_type, entity_id, action, summary, source)
  values (cid, p_project_id, auth.uid(), audit.actor_name(), p_entity_type, p_entity_id, 'event',
          p_summary, coalesce(p_source, 'ui'))
  returning id into new_id;
  return new_id;
end $$;
revoke all on function public.log_activity(uuid, text, uuid, text, text) from public, anon;
grant execute on function public.log_activity(uuid, text, uuid, text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- Attach to the tables that matter. Column lists = what is worth a history row.
-- ----------------------------------------------------------------------------
create trigger projects_audit after insert or update or delete on public.projects
  for each row execute function audit.row_change(
    'name', 'status', 'type', 'client_name', 'client_phone', 'client_email', 'address',
    'start_date', 'target_end_date', 'actual_end_date', 'deleted_at');

create trigger estimates_audit after update on public.estimates
  for each row execute function audit.row_change(
    'status', 'tax_pct', 'waste_pct', 'labor_pct', 'contingency_pct',
    'sqft', 'footprint_sqft', 'stories');

create trigger estimate_sections_audit after insert or update or delete on public.estimate_sections
  for each row execute function audit.row_change('name');

create trigger estimate_items_audit after insert or update or delete on public.estimate_items
  for each row execute function audit.row_change('name', 'qty', 'unit', 'done', 'active_option_id');

create trigger estimate_item_options_audit after update on public.estimate_item_options
  for each row execute function audit.row_change('unit_price', 'url', 'label');

create trigger budgets_audit after insert or update or delete on public.budgets
  for each row execute function audit.row_change('name', 'status');

create trigger budget_lines_audit after insert or update or delete on public.budget_lines
  for each row execute function audit.row_change('category', 'budgeted', 'committed', 'actual');

create trigger task_lists_audit after insert or delete on public.task_lists
  for each row execute function audit.row_change('name');

create trigger tasks_audit after insert or update or delete on public.tasks
  for each row execute function audit.row_change('title', 'status', 'assignee_id', 'due_date');

create trigger notes_audit after insert or update or delete on public.notes
  for each row execute function audit.row_change('pinned', 'deleted_at');

create trigger files_audit after insert or update or delete on public.files
  for each row execute function audit.row_change('caption', 'deleted_at', 'kind');

create trigger memberships_audit after insert or update on public.memberships
  for each row execute function audit.row_change('role', 'is_active');

create trigger project_members_audit after insert or delete on public.project_members
  for each row execute function audit.row_change();

create trigger role_permissions_audit after update on public.role_permissions
  for each row execute function audit.row_change('allowed');

-- ----------------------------------------------------------------------------
-- Row-level security: readable by scope, never writable by users.
-- ----------------------------------------------------------------------------
alter table public.audit_log enable row level security;
create policy audit_log_select on public.audit_log for select to authenticated
  using (authz.is_member(company_id)
         and (authz.has_cap(company_id, 'audit.view_all')
              or (project_id is not null and authz.on_project(project_id)
                  and authz.has_cap(company_id, 'audit.view_project'))));
