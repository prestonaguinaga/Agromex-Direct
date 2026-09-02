-- ============================================================================
-- Monarch Admin · migration 0007 · project management
-- Construction phases, subcontractors, richer tasks (trade / dates / notes /
-- phase / sub), reusable checklist templates, note links, photo metadata,
-- contract amount, manager, manual progress override, and an activity feed
-- that reads like a site log ("changed Electrical budget from $26,000 to
-- $28,500") with minor edits classified so the feed stays meaningful.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Projects: manager and the manual progress override (kept next to, never
-- instead of, the calculated figure).
-- ----------------------------------------------------------------------------
alter table public.projects
  add column manager_id           uuid references public.profiles (id) on delete set null,
  add column manual_progress_pct  numeric(5,2) check (manual_progress_pct between 0 and 100),
  add column manual_progress_by   uuid,
  add column manual_progress_at   timestamptz,
  add column manual_progress_note text not null default '';

-- ----------------------------------------------------------------------------
-- Construction phases
-- ----------------------------------------------------------------------------
create table public.project_phases (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies (id) on delete cascade,
  project_id     uuid not null references public.projects (id) on delete cascade,
  key            text,                                   -- template key (framing, drywall…)
  name           text not null,
  status         text not null default 'not_started'
                 check (status in ('not_started', 'in_progress', 'complete', 'blocked')),
  position       int not null default 0,
  planned_start  date,
  planned_end    date,
  actual_start   date,
  actual_end     date,
  weight         numeric(6,2) not null default 1,
  notes          text not null default '',
  created_at     timestamptz not null default now(),
  created_by     uuid,
  updated_at     timestamptz not null default now(),
  updated_by     uuid
);
create index project_phases_project_idx on public.project_phases (project_id, position);

create trigger project_phases_touch before insert or update on public.project_phases
  for each row execute function public.touch_row();

-- Starting or finishing a phase stamps the actual dates.
create or replace function public.project_phases_dates() returns trigger
language plpgsql as $$
begin
  if new.status = 'in_progress' and new.actual_start is null then new.actual_start := current_date; end if;
  if new.status = 'complete' then
    if new.actual_start is null then new.actual_start := current_date; end if;
    if new.actual_end is null then new.actual_end := current_date; end if;
  elsif tg_op = 'UPDATE' and old.status = 'complete' then
    new.actual_end := null;
  end if;
  return new;
end $$;
create trigger project_phases_dates before insert or update of status on public.project_phases
  for each row execute function public.project_phases_dates();

-- ----------------------------------------------------------------------------
-- Subcontractors (directory; applications arrive in a later phase)
-- ----------------------------------------------------------------------------
create table public.subcontractors (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id) on delete cascade,
  name          text not null,
  trade         text not null default '',
  contact_name  text not null default '',
  phone         text not null default '',
  email         text not null default '',
  notes         text not null default '',
  status        text not null default 'active' check (status in ('active', 'inactive')),
  created_at    timestamptz not null default now(),
  created_by    uuid,
  updated_at    timestamptz not null default now(),
  updated_by    uuid
);
create index subcontractors_company_idx on public.subcontractors (company_id, name);
create trigger subcontractors_touch before insert or update on public.subcontractors
  for each row execute function public.touch_row();

-- ----------------------------------------------------------------------------
-- Tasks & checklists grow up
-- ----------------------------------------------------------------------------
alter table public.tasks
  add column trade             text not null default '',
  add column start_date        date,
  add column notes             text not null default '',
  add column phase_id          uuid references public.project_phases (id) on delete set null,
  add column subcontractor_id  uuid references public.subcontractors (id) on delete set null;
create index tasks_phase_idx on public.tasks (phase_id);

alter table public.task_lists
  add column phase_id      uuid references public.project_phases (id) on delete set null,
  add column template_key  text;

-- A task in a phase's checklist belongs to that phase unless told otherwise.
create or replace function public.tasks_inherit_phase() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.phase_id is null and new.task_list_id is not null then
    select l.phase_id into new.phase_id from public.task_lists l where l.id = new.task_list_id;
  end if;
  return new;
end $$;
create trigger tasks_inherit_phase before insert or update of task_list_id on public.tasks
  for each row execute function public.tasks_inherit_phase();

-- The complete-only guard learns the new columns.
create or replace function public.tasks_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return new; end if;
  if authz.has_cap(new.company_id, 'tasks.manage') then return new; end if;
  if tg_op = 'INSERT' then
    raise exception 'Your role can complete tasks but not create them.' using errcode = '42501';
  end if;
  if new.title <> old.title
     or new.description <> old.description
     or new.notes <> old.notes
     or new.trade <> old.trade
     or new.task_list_id is distinct from old.task_list_id
     or new.phase_id is distinct from old.phase_id
     or new.assignee_id is distinct from old.assignee_id
     or new.subcontractor_id is distinct from old.subcontractor_id
     or new.start_date is distinct from old.start_date
     or new.due_date is distinct from old.due_date
     or new.priority <> old.priority
     or new.is_milestone <> old.is_milestone
     or new.position <> old.position
     or new.project_id <> old.project_id then
    raise exception 'Your role can only change the status of a task.' using errcode = '42501';
  end if;
  return new;
end $$;

-- Reusable checklist templates (company-authored; built-ins ship in code).
create table public.checklist_templates (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  key         text,
  name        text not null,
  phase_key   text,
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  created_by  uuid,
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);
create table public.checklist_template_items (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies (id) on delete cascade,
  template_id  uuid not null references public.checklist_templates (id) on delete cascade,
  title        text not null,
  trade        text not null default '',
  position     int not null default 0
);
create index checklist_template_items_template_idx on public.checklist_template_items (template_id, position);
create trigger checklist_templates_touch before insert or update on public.checklist_templates
  for each row execute function public.touch_row();

-- ----------------------------------------------------------------------------
-- Photos carry a phase and an optional task; notes can point at things.
-- ----------------------------------------------------------------------------
alter table public.files
  add column phase_id  uuid references public.project_phases (id) on delete set null,
  add column task_id   uuid references public.tasks (id) on delete set null;
create index files_phase_idx on public.files (project_id, phase_id) where deleted_at is null;

alter table public.notes
  add column task_id         uuid references public.tasks (id) on delete set null,
  add column budget_line_id  uuid references public.budget_lines (id) on delete set null,
  add column file_id         uuid references public.files (id) on delete set null,
  add column phase_id        uuid references public.project_phases (id) on delete set null;

-- The original contract / estimate amount lives with the budget so the money
-- policies (budgets.view) cover it.
alter table public.budgets
  add column contract_amount numeric(12,2);

-- ----------------------------------------------------------------------------
-- Progress: calculated strictly from tasks & checklist items.
-- (Estimate check-offs are procurement, shown separately, no longer counted.)
-- ----------------------------------------------------------------------------
create or replace function public.recompute_project_progress(pid uuid) returns void
language sql security definer set search_path = '' as $$
  update public.projects p
  set progress_pct = coalesce((
    select round(100.0 * count(*) filter (where t.status = 'done') / nullif(count(*), 0), 1)
    from public.tasks t where t.project_id = pid), 0)
  where p.id = pid;
$$;
drop trigger if exists estimate_items_progress on public.estimate_items;
drop function if exists public.estimate_items_progress();

-- Only roles with progress.override may set or clear the manual figure.
create or replace function public.projects_progress_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.manual_progress_pct is distinct from old.manual_progress_pct
     or new.manual_progress_note is distinct from old.manual_progress_note then
    if auth.uid() is not null and not authz.has_cap(new.company_id, 'progress.override') then
      raise exception 'Your role cannot override the project progress.' using errcode = '42501';
    end if;
    new.manual_progress_by := case when new.manual_progress_pct is null then null else auth.uid() end;
    new.manual_progress_at := case when new.manual_progress_pct is null then null else now() end;
  end if;
  return new;
end $$;
create trigger projects_progress_guard before update on public.projects
  for each row execute function public.projects_progress_guard();

-- ----------------------------------------------------------------------------
-- Capabilities: three new ones, seeded into every existing company.
-- ----------------------------------------------------------------------------
create or replace function authz.capabilities() returns setof text
language sql immutable as $$
  values ('projects.view_all'), ('projects.create'), ('projects.edit'), ('projects.delete'),
         ('estimates.view'), ('estimates.edit'),
         ('budgets.view'), ('budgets.edit'),
         ('tasks.manage'), ('tasks.complete'), ('progress.override'),
         ('notes.create'), ('notes.manage'),
         ('files.view'), ('files.upload'), ('files.delete'),
         ('subcontractors.view'), ('subcontractors.manage'),
         ('team.view'), ('team.manage'), ('permissions.manage'),
         ('audit.view_all'), ('audit.view_project'),
         ('settings.manage')
$$;

create or replace function authz.default_grants() returns table (role public.role_key, capability text)
language sql immutable as $$
  select 'admin'::public.role_key, c from authz.capabilities() c where c <> 'permissions.manage'
  union all
  select 'project_manager', unnest(array[
    'projects.view_all','projects.create','projects.edit',
    'estimates.view','estimates.edit','budgets.view','budgets.edit',
    'tasks.manage','tasks.complete','progress.override','notes.create','notes.manage',
    'files.view','files.upload','files.delete','subcontractors.view','subcontractors.manage',
    'team.view','audit.view_project'])
  union all
  select 'estimator', unnest(array[
    'projects.view_all','projects.create','estimates.view','estimates.edit','budgets.view',
    'tasks.complete','notes.create','files.view','files.upload','subcontractors.view',
    'team.view','audit.view_project'])
  union all
  select 'employee', unnest(array[
    'tasks.complete','notes.create','files.view','files.upload','subcontractors.view',
    'team.view','audit.view_project'])
  union all
  select 'read_only', unnest(array[
    'estimates.view','files.view','team.view','audit.view_project'])
$$;

select authz.seed_permissions(id) from public.companies;

-- ----------------------------------------------------------------------------
-- Row-level security for the new tables
-- ----------------------------------------------------------------------------
alter table public.project_phases enable row level security;
alter table public.subcontractors enable row level security;
alter table public.checklist_templates enable row level security;
alter table public.checklist_template_items enable row level security;

create policy project_phases_select on public.project_phases for select to authenticated
  using (authz.on_project(project_id));
create policy project_phases_write on public.project_phases for all to authenticated
  using (authz.on_project(project_id)
         and (authz.has_cap(company_id, 'tasks.manage') or authz.has_cap(company_id, 'projects.edit')))
  with check (authz.on_project(project_id)
              and (authz.has_cap(company_id, 'tasks.manage') or authz.has_cap(company_id, 'projects.edit')));

create policy subcontractors_select on public.subcontractors for select to authenticated
  using (authz.is_member(company_id) and authz.has_cap(company_id, 'subcontractors.view'));
create policy subcontractors_write on public.subcontractors for all to authenticated
  using (authz.has_cap(company_id, 'subcontractors.manage'))
  with check (authz.has_cap(company_id, 'subcontractors.manage'));

create policy checklist_templates_select on public.checklist_templates for select to authenticated
  using (authz.is_member(company_id));
create policy checklist_templates_write on public.checklist_templates for all to authenticated
  using (authz.has_cap(company_id, 'tasks.manage'))
  with check (authz.has_cap(company_id, 'tasks.manage'));
create policy checklist_template_items_select on public.checklist_template_items for select to authenticated
  using (authz.is_member(company_id));
create policy checklist_template_items_write on public.checklist_template_items for all to authenticated
  using (authz.has_cap(company_id, 'tasks.manage'))
  with check (authz.has_cap(company_id, 'tasks.manage'));

-- ----------------------------------------------------------------------------
-- Activity feed: verb-first summaries, whole-dollar money, major/minor kind.
-- The UI renders  <actor> <summary>.
-- ----------------------------------------------------------------------------
alter table public.audit_log
  add column kind text not null default 'major' check (kind in ('major', 'minor'));
create index audit_log_project_major_idx on public.audit_log (project_id, created_at desc) where kind = 'major';

create or replace function audit.money(v jsonb) returns text
language sql immutable as $$
  select case
    when v is null or jsonb_typeof(v) = 'null' then '—'
    when (v #>> '{}')::numeric = trunc((v #>> '{}')::numeric)
      then '$' || to_char((v #>> '{}')::numeric, 'FM999,999,999,990')
    else '$' || to_char((v #>> '{}')::numeric, 'FM999,999,999,990.00')
  end
$$;

-- Numbers read like a person wrote them: 65 not 65.00, 33.3 not 33.30.
create or replace function audit.scalar(v jsonb) returns text
language sql immutable as $$
  select case
    when v is null or jsonb_typeof(v) = 'null' then '—'
    when jsonb_typeof(v) = 'string' then v #>> '{}'
    when jsonb_typeof(v) = 'number' then
      case when (v #>> '{}') like '%.%' then rtrim(rtrim(v #>> '{}', '0'), '.') else v #>> '{}' end
    else v::text
  end
$$;

create or replace function audit.status_label(s text) returns text
language sql immutable as $$
  select case s
    when 'todo' then 'To Do'
    when 'in_progress' then 'In Progress'
    when 'blocked' then 'Blocked'
    when 'done' then 'Complete'
    when 'not_started' then 'Not Started'
    when 'complete' then 'Complete'
    when 'on_hold' then 'On Hold'
    else initcap(replace(coalesce(s, '—'), '_', ' '))
  end
$$;

create or replace function audit.kind_of(tbl text, action text, field text) returns text
language sql immutable as $$
  select case
    when tbl = 'estimate_sections' then 'minor'
    when tbl = 'estimate_items' then 'minor'
    when tbl = 'estimate_item_options' and field is distinct from 'unit_price' then 'minor'
    when tbl = 'files' and action = 'update' and field = 'caption' then 'minor'
    when tbl = 'notes' and action = 'update' and field = 'pinned' then 'minor'
    when tbl = 'projects' and field in ('client_phone', 'client_email', 'address', 'type') then 'minor'
    when tbl = 'project_phases' and field in ('name', 'planned_start', 'planned_end') then 'minor'
    when tbl = 'subcontractors' and action = 'update' then 'minor'
    else 'major'
  end
$$;

create or replace function audit.phase_name(pid uuid) returns text
language sql stable security definer set search_path = '' as $$
  select p.name from public.project_phases p where p.id = pid
$$;

create or replace function audit.summarise(
  tbl text, action text, field text, oldv jsonb, newv jsonb, row_data jsonb
) returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  label text := coalesce(nullif(row_data->>'name', ''), nullif(row_data->>'title', ''),
                         nullif(row_data->>'category', ''), nullif(row_data->>'label', ''), '');
  q text := '"' || label || '"';
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
    when 'files' then case row_data->>'kind' when 'photo' then 'progress photo' else coalesce(row_data->>'kind', 'file') end
    when 'memberships' then 'team member'
    when 'project_members' then 'project assignment'
    when 'project_phases' then 'phase'
    when 'subcontractors' then 'subcontractor'
    when 'checklist_templates' then 'checklist template'
    when 'role_permissions' then 'permission'
    else replace(tbl, '_', ' ') end;
  o text := audit.scalar(oldv);
  n text := audit.scalar(newv);
begin
  -- ── inserts ──────────────────────────────────────────────────────────
  if action = 'insert' then
    return case tbl
      when 'notes' then 'added a project note: "' || left(coalesce(row_data->>'body', ''), 80)
                        || case when length(coalesce(row_data->>'body', '')) > 80 then '…"' else '"' end
      when 'files' then 'uploaded ' || case row_data->>'kind' when 'photo' then 'a progress photo ' else entity || ' ' end || '"' || coalesce(row_data->>'name', '') || '"'
      when 'memberships' then 'added ' || audit.profile_name((row_data->>'user_id')::uuid)
                              || ' to the team as ' || replace(coalesce(row_data->>'role', ''), '_', ' ')
      when 'project_members' then 'assigned ' || audit.profile_name((row_data->>'user_id')::uuid) || ' to the project'
      when 'projects' then 'created project ' || q
      when 'tasks' then 'added task ' || q
      when 'task_lists' then 'added checklist ' || q
      when 'project_phases' then 'added phase ' || q
      when 'subcontractors' then 'added subcontractor ' || q
      when 'budget_lines' then 'added budget line ' || q || ' at ' || audit.money(row_data->'budgeted')
      when 'budgets' then 'created the budget'
      when 'estimate_items' then 'added line item ' || q
      when 'estimate_sections' then 'added section ' || q
      else 'added ' || entity || case when label <> '' then ' ' || q else '' end
    end;
  end if;

  -- ── deletes ──────────────────────────────────────────────────────────
  if action = 'delete' then
    return case tbl
      when 'notes' then 'deleted a note'
      when 'files' then 'deleted ' || entity || ' "' || coalesce(row_data->>'name', '') || '"'
      when 'project_members' then 'removed ' || audit.profile_name((row_data->>'user_id')::uuid) || ' from the project'
      when 'tasks' then 'removed task ' || q
      when 'task_lists' then 'removed checklist ' || q
      when 'project_phases' then 'removed phase ' || q
      when 'budget_lines' then 'removed budget line ' || q
      when 'estimate_items' then 'removed line item ' || q
      when 'estimate_sections' then 'removed section ' || q
      else 'removed ' || entity || case when label <> '' then ' ' || q else '' end
    end;
  end if;

  -- ── updates ──────────────────────────────────────────────────────────
  if tbl = 'budget_lines' then
    return case field
      when 'budgeted'  then format('changed %s budget from %s to %s', label, audit.money(oldv), audit.money(newv))
      when 'committed' then format('changed %s committed amount from %s to %s', label, audit.money(oldv), audit.money(newv))
      when 'actual'    then format('changed %s spent amount from %s to %s', label, audit.money(oldv), audit.money(newv))
      when 'category'  then format('renamed budget line "%s" to "%s"', o, n)
      else format('changed budget line %s %s from "%s" to "%s"', q, field, o, n) end;
  elsif tbl = 'budgets' and field = 'contract_amount' then
    return format('changed the contract amount from %s to %s', audit.money(oldv), audit.money(newv));
  elsif tbl = 'estimate_item_options' then
    return case field
      when 'unit_price' then format('changed the price of "%s" from %s to %s', audit.item_name((row_data->>'item_id')::uuid), audit.money(oldv), audit.money(newv))
      when 'url' then format('updated the product link for "%s"', audit.item_name((row_data->>'item_id')::uuid))
      else format('renamed an option for "%s" to "%s"', audit.item_name((row_data->>'item_id')::uuid), n) end;
  elsif tbl = 'estimate_items' then
    return case field
      when 'done' then case when (newv #>> '{}')::boolean then 'checked off ' || q else 'unchecked ' || q end
      when 'qty' then format('changed quantity of %s from %s to %s %s', q, o, n, coalesce(row_data->>'unit', ''))
      when 'name' then format('renamed line item "%s" to "%s"', o, n)
      when 'active_option_id' then 'selected a different product option for ' || q
      else format('changed %s of line item %s', field, q) end;
  elsif tbl = 'estimate_sections' then
    return format('renamed section "%s" to "%s"', o, n);
  elsif tbl = 'tasks' then
    return case field
      when 'status' then case
        when n = 'done' then 'completed ' || label
        when o = 'done' then 'reopened task ' || q
        else format('moved task %s from %s to %s', q, audit.status_label(o), audit.status_label(n)) end
      when 'assignee_id' then case when newv is null or jsonb_typeof(newv) = 'null'
        then 'unassigned task ' || q
        else format('assigned task %s to %s', q, audit.profile_name((newv #>> '{}')::uuid)) end
      when 'due_date' then format('changed due date of %s from %s to %s', q, o, n)
      when 'title' then format('renamed task "%s" to "%s"', o, n)
      else format('changed %s of task %s', replace(field, '_', ' '), q) end;
  elsif tbl = 'task_lists' then
    return format('renamed checklist "%s" to "%s"', o, n);
  elsif tbl = 'project_phases' then
    return case field
      when 'status' then case n
        when 'in_progress' then 'started phase ' || label
        when 'complete' then 'completed phase ' || label
        when 'blocked' then 'marked phase ' || label || ' blocked'
        else 'reset phase ' || label || ' to not started' end
      when 'name' then format('renamed phase "%s" to "%s"', o, n)
      else format('changed %s of phase %s from %s to %s', replace(field, '_', ' '), label, o, n) end;
  elsif tbl = 'notes' then
    return case field
      when 'pinned' then case when (newv #>> '{}')::boolean then 'pinned a note' else 'unpinned a note' end
      when 'deleted_at' then 'deleted a note'
      else 'edited a note' end;
  elsif tbl = 'files' then
    return case field
      when 'deleted_at' then 'deleted ' || entity || ' "' || coalesce(row_data->>'name', '') || '"'
      when 'caption' then 'captioned ' || entity || ' "' || coalesce(row_data->>'name', '') || '"'
      when 'phase_id' then format('moved %s "%s" to phase %s', entity, coalesce(row_data->>'name', ''), coalesce(audit.phase_name((newv #>> '{}')::uuid), '—'))
      else format('changed %s of %s "%s"', field, entity, coalesce(row_data->>'name', '')) end;
  elsif tbl = 'memberships' then
    return case field
      when 'role' then format('changed %s''s role from %s to %s', audit.profile_name((row_data->>'user_id')::uuid), replace(o, '_', ' '), replace(n, '_', ' '))
      when 'is_active' then case when (newv #>> '{}')::boolean
        then 'reactivated ' || audit.profile_name((row_data->>'user_id')::uuid)
        else 'deactivated ' || audit.profile_name((row_data->>'user_id')::uuid) end
      else format('changed %s of team member', field) end;
  elsif tbl = 'role_permissions' then
    return format('%s %s %s %s', case when (newv #>> '{}')::boolean then 'granted' else 'revoked' end,
                  row_data->>'capability', case when (newv #>> '{}')::boolean then 'to' else 'from' end,
                  replace(coalesce(row_data->>'role', ''), '_', ' '));
  elsif tbl = 'projects' then
    return case field
      when 'name' then format('renamed the project to "%s"', n)
      when 'status' then format('changed project status from %s to %s', audit.status_label(o), audit.status_label(n))
      when 'start_date' then format('changed the start date from %s to %s', o, n)
      when 'target_end_date' then format('changed target completion from %s to %s', o, n)
      when 'actual_end_date' then format('set actual completion to %s', n)
      when 'manager_id' then case when newv is null or jsonb_typeof(newv) = 'null'
        then 'cleared the project manager'
        else format('set %s as project manager', audit.profile_name((newv #>> '{}')::uuid)) end
      when 'manual_progress_pct' then case when newv is null or jsonb_typeof(newv) = 'null'
        then format('cleared the manual progress override (calculated %s%%)', audit.scalar(row_data->'progress_pct'))
        else format('set project progress to %s%% (calculated %s%%)', n, audit.scalar(row_data->'progress_pct')) end
      when 'deleted_at' then case when newv is null or jsonb_typeof(newv) = 'null' then 'restored the project' else 'deleted the project' end
      when 'client_name' then format('changed the customer from "%s" to "%s"', o, n)
      else format('changed the project %s from "%s" to "%s"', replace(field, '_', ' '), o, n) end;
  elsif tbl = 'estimates' and field like '%_pct' then
    return format('changed estimate %s from %s%% to %s%%', replace(replace(field, '_pct', ''), '_', ' '), o, n);
  elsif tbl = 'subcontractors' then
    return format('changed %s of subcontractor %s from "%s" to "%s"', field, q, o, n);
  end if;
  return format('changed %s%s %s from "%s" to "%s"', entity,
                case when label <> '' then ' ' || q else '' end, replace(field, '_', ' '), o, n);
end $$;

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
           action, field, old_value, new_value, summary, source, kind)
        values
          (cid, pid, actor, aname, tg_table_name, (rowj->>'id')::uuid,
           'update', col, oldj->col, newj->col,
           audit.summarise(tg_table_name, 'update', col, oldj->col, newj->col, newj), src,
           audit.kind_of(tg_table_name, 'update', col));
      end if;
    end loop;
  else
    insert into public.audit_log
      (company_id, project_id, actor_id, actor_name, entity_type, entity_id,
       action, old_value, new_value, summary, source, kind)
    values
      (cid, pid, actor, aname, tg_table_name, (rowj->>'id')::uuid,
       lower(tg_op),
       case when tg_op = 'DELETE' then oldj end,
       case when tg_op = 'INSERT' then newj end,
       audit.summarise(tg_table_name, lower(tg_op), null, null, null, rowj), src,
       audit.kind_of(tg_table_name, lower(tg_op), null));
  end if;
  return null;
end $$;

-- Re-attach the triggers whose watched columns changed, and add the new tables.
drop trigger if exists projects_audit on public.projects;
create trigger projects_audit after insert or update or delete on public.projects
  for each row execute function audit.row_change(
    'name', 'status', 'client_name', 'client_phone', 'client_email', 'address',
    'start_date', 'target_end_date', 'actual_end_date', 'deleted_at',
    'manager_id', 'manual_progress_pct');

drop trigger if exists budgets_audit on public.budgets;
create trigger budgets_audit after insert or update or delete on public.budgets
  for each row execute function audit.row_change('name', 'status', 'contract_amount');

drop trigger if exists files_audit on public.files;
create trigger files_audit after insert or update or delete on public.files
  for each row execute function audit.row_change('caption', 'deleted_at', 'phase_id');

create trigger project_phases_audit after insert or update or delete on public.project_phases
  for each row execute function audit.row_change('status', 'name', 'planned_start', 'planned_end');

create trigger subcontractors_audit after insert or update or delete on public.subcontractors
  for each row execute function audit.row_change('name', 'trade', 'status');

-- ----------------------------------------------------------------------------
-- project_summary v2: phase, work counts, money, and the displayed progress
-- with its source. security_invoker keeps every column behind the policies.
-- ----------------------------------------------------------------------------
drop view if exists public.project_summary;
create view public.project_summary with (security_invoker = true) as
with active_estimate as (
  select distinct on (e.project_id) e.*
  from public.estimates e
  where e.deleted_at is null
  order by e.project_id, e.version desc
),
item_totals as (
  select i.estimate_id,
         sum(case when o.unit_price is not null then o.unit_price * i.qty end) as materials,
         count(*) filter (where o.unit_price is not null) as priced_items,
         count(*) filter (where o.unit_price is null)     as unpriced_items,
         count(*) filter (where i.done)                   as done_items,
         count(*)                                         as total_items
  from public.estimate_items i
  left join lateral (
    select o.unit_price from public.estimate_item_options o
    where o.item_id = i.id
    order by (o.id = i.active_option_id) desc, o.position
    limit 1
  ) o on true
  group by i.estimate_id
),
task_totals as (
  select t.project_id,
         count(*) as tasks_total,
         count(*) filter (where t.status = 'done')        as tasks_done,
         count(*) filter (where t.status = 'in_progress') as tasks_in_progress,
         count(*) filter (where t.status = 'blocked')     as tasks_blocked,
         count(*) filter (where t.status <> 'done' and t.due_date is not null and t.due_date < current_date) as tasks_overdue
  from public.tasks t
  group by t.project_id
),
phase_totals as (
  select p.project_id,
         count(*) as phases_total,
         count(*) filter (where p.status = 'complete') as phases_complete
  from public.project_phases p
  group by p.project_id
),
current_phase as (
  select distinct on (p.project_id) p.project_id, p.id as phase_id, p.name as phase_name, p.status as phase_status
  from public.project_phases p
  where p.status in ('in_progress', 'blocked', 'not_started')
  order by p.project_id,
           case p.status when 'in_progress' then 0 when 'blocked' then 1 else 2 end,
           p.position
),
active_budget as (
  select b.project_id, b.id as budget_id, b.contract_amount,
         coalesce(l.budgeted, 0) as budgeted, coalesce(l.committed, 0) as committed, coalesce(l.actual, 0) as actual
  from public.budgets b
  left join lateral (
    select sum(budgeted) as budgeted, sum(committed) as committed, sum(actual) as actual
    from public.budget_lines bl where bl.budget_id = b.id
  ) l on true
  where b.status = 'active'
),
base as (
  select p.*,
         e.id as estimate_id,
         e.tax_pct, e.waste_pct, e.labor_pct, e.contingency_pct,
         coalesce(it.materials, 0)      as materials,
         coalesce(it.priced_items, 0)   as priced_items,
         coalesce(it.unpriced_items, 0) as unpriced_items,
         coalesce(it.done_items, 0)     as done_items,
         coalesce(it.total_items, 0)    as total_items,
         coalesce(tt.tasks_total, 0)        as tasks_total,
         coalesce(tt.tasks_done, 0)         as tasks_done,
         coalesce(tt.tasks_in_progress, 0)  as tasks_in_progress,
         coalesce(tt.tasks_blocked, 0)      as tasks_blocked,
         coalesce(tt.tasks_overdue, 0)      as tasks_overdue,
         coalesce(ph.phases_total, 0)       as phases_total,
         coalesce(ph.phases_complete, 0)    as phases_complete,
         cp.phase_id      as current_phase_id,
         cp.phase_name    as current_phase_name,
         cp.phase_status  as current_phase_status,
         ab.budget_id, ab.contract_amount,
         coalesce(ab.budgeted, 0)  as budget_budgeted,
         coalesce(ab.committed, 0) as budget_committed,
         coalesce(ab.actual, 0)    as budget_actual
  from public.projects p
  left join active_estimate e on e.project_id = p.id
  left join item_totals it on it.estimate_id = e.id
  left join task_totals tt on tt.project_id = p.id
  left join phase_totals ph on ph.project_id = p.id
  left join current_phase cp on cp.project_id = p.id
  left join active_budget ab on ab.project_id = p.id
  where p.deleted_at is null
),
money as (
  select b.*, b.materials * coalesce(b.waste_pct, 0) / 100 as waste from base b
),
money2 as (
  select m.*,
         (m.materials + m.waste) * coalesce(m.tax_pct, 0) / 100 as tax,
         m.materials * coalesce(m.labor_pct, 0) / 100          as labor
  from money m
)
select m.id, m.company_id, m.number, m.name, m.type, m.status, m.template,
       m.client_name, m.client_phone, m.client_email, m.address,
       m.manager_id,
       m.start_date, m.target_end_date, m.actual_end_date,
       m.progress_pct,
       m.manual_progress_pct, m.manual_progress_by, m.manual_progress_at, m.manual_progress_note,
       coalesce(m.manual_progress_pct, m.progress_pct) as display_progress_pct,
       case when m.manual_progress_pct is null then 'calculated' else 'manual' end as progress_source,
       m.created_at, m.created_by, m.updated_at, m.updated_by,
       m.estimate_id,
       round(m.materials, 2) as materials,
       round(m.waste, 2)     as waste,
       round(m.tax, 2)       as tax,
       round(m.labor, 2)     as labor,
       round((m.materials + m.waste + m.tax + m.labor) * coalesce(m.contingency_pct, 0) / 100, 2) as contingency,
       round((m.materials + m.waste + m.tax + m.labor)
             * (1 + coalesce(m.contingency_pct, 0) / 100), 2) as grand,
       m.priced_items, m.unpriced_items, m.done_items, m.total_items,
       m.tasks_total, m.tasks_done, m.tasks_in_progress, m.tasks_blocked, m.tasks_overdue,
       m.phases_total, m.phases_complete,
       m.current_phase_id, m.current_phase_name, m.current_phase_status,
       m.budget_id, m.contract_amount, m.budget_budgeted, m.budget_committed, m.budget_actual
from money2 m;

grant select on public.project_summary to authenticated;

-- ----------------------------------------------------------------------------
-- Realtime for the new tables
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['project_phases', 'subcontractors', 'checklist_templates', 'checklist_template_items'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
    execute format('alter table public.%I replica identity full', t);
  end loop;
end $$;
