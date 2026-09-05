-- ============================================================================
-- Monarch Admin · migration 0010 · House plans
-- One structured house model per project (rooms, openings, stairs, roof,
-- settings — see lib/plan/model.ts). Bob edits it through validated
-- operations; floor plans, schedules, DXF exports and code checks are all
-- derived from it. Saves go through save_house_plan(), which refuses a write
-- against a stale version so two editors never clobber each other, and
-- writes a plain-English activity line for every change.
--   * capability plans.edit (admin, project manager, estimator by default);
--     reading follows project visibility like notes and tasks.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Capabilities
-- ----------------------------------------------------------------------------
create or replace function authz.capabilities() returns setof text
language sql immutable as $$
  values ('projects.view_all'), ('projects.create'), ('projects.edit'), ('projects.delete'),
         ('estimates.view'), ('estimates.edit'),
         ('plans.edit'),
         ('budgets.view'), ('budgets.edit'),
         ('tasks.manage'), ('tasks.complete'), ('progress.override'),
         ('notes.create'), ('notes.manage'),
         ('files.view'), ('files.upload'), ('files.delete'),
         ('subcontractors.view'), ('subcontractors.manage'),
         ('leads.view'), ('leads.manage'),
         ('briefs.view'),
         ('team.view'), ('team.manage'), ('permissions.manage'),
         ('audit.view_all'), ('audit.view_project'),
         ('settings.manage'),
         ('bob.use')
$$;

create or replace function authz.default_grants() returns table (role public.role_key, capability text)
language sql immutable as $$
  select 'admin'::public.role_key, c from authz.capabilities() c where c <> 'permissions.manage'
  union all
  select 'project_manager', unnest(array[
    'projects.view_all','projects.create','projects.edit',
    'estimates.view','estimates.edit','plans.edit','budgets.view','budgets.edit',
    'tasks.manage','tasks.complete','progress.override','notes.create','notes.manage',
    'files.view','files.upload','files.delete','subcontractors.view','subcontractors.manage',
    'leads.view','leads.manage','briefs.view',
    'team.view','audit.view_project','bob.use'])
  union all
  select 'estimator', unnest(array[
    'projects.view_all','projects.create','estimates.view','estimates.edit','plans.edit','budgets.view',
    'tasks.complete','notes.create','files.view','files.upload','subcontractors.view',
    'leads.view','briefs.view',
    'team.view','audit.view_project','bob.use'])
  union all
  select 'employee', unnest(array[
    'tasks.complete','notes.create','files.view','files.upload','subcontractors.view',
    'team.view','audit.view_project','bob.use'])
  union all
  select 'read_only', unnest(array[
    'estimates.view','files.view','team.view','audit.view_project','bob.use'])
$$;

select authz.seed_permissions(id) from public.companies;

-- ----------------------------------------------------------------------------
-- The model
-- ----------------------------------------------------------------------------
create table public.house_plans (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies (id) on delete cascade,
  project_id   uuid not null references public.projects (id) on delete cascade,
  title        text not null default '',
  model        jsonb not null default '{}'::jsonb,   -- lib/plan/model.ts HousePlan
  version      int not null default 1,               -- bumped on every save; saves must name the version they read
  code_fails   int not null default 0,               -- last code-check counts, for lists and the dashboard
  code_warns   int not null default 0,
  created_at   timestamptz not null default now(),
  created_by   uuid,
  updated_at   timestamptz not null default now(),
  updated_by   uuid,
  deleted_at   timestamptz
);
create unique index house_plans_one_per_project on public.house_plans (project_id) where deleted_at is null;
create index house_plans_company_idx on public.house_plans (company_id, updated_at desc) where deleted_at is null;

create trigger house_plans_touch before insert or update on public.house_plans
  for each row execute function public.touch_row();
-- Version bumps are described by save_house_plan()'s activity line; the audit trigger
-- only watches the title and soft delete so history stays readable.
create trigger house_plans_audit after insert or update on public.house_plans
  for each row execute function audit.row_change('title', 'deleted_at');

-- ----------------------------------------------------------------------------
-- Row-level security
-- ----------------------------------------------------------------------------
alter table public.house_plans enable row level security;

create policy house_plans_select on public.house_plans for select to authenticated
  using (deleted_at is null and authz.on_project(project_id));
create policy house_plans_insert on public.house_plans for insert to authenticated
  with check (authz.is_member(company_id) and authz.has_cap(company_id, 'plans.edit') and authz.on_project(project_id));
create policy house_plans_update on public.house_plans for update to authenticated
  using (authz.has_cap(company_id, 'plans.edit') and authz.on_project(project_id))
  with check (authz.has_cap(company_id, 'plans.edit') and authz.on_project(project_id));

-- ----------------------------------------------------------------------------
-- Save with optimistic concurrency + an activity line
-- ----------------------------------------------------------------------------
create or replace function public.save_house_plan(
  p_project_id uuid,
  p_expected_version int,
  p_model jsonb,
  p_title text default null,
  p_summary text default null,
  p_code_fails int default 0,
  p_code_warns int default 0,
  p_source text default 'ui'
) returns public.house_plans
language plpgsql security invoker set search_path = public as $$
declare
  cid uuid;
  cur int;
  r public.house_plans;
begin
  select company_id into cid from projects where id = p_project_id;
  if cid is null then
    raise exception 'Project not accessible' using errcode = '42501';
  end if;
  select version into cur from house_plans where project_id = p_project_id and deleted_at is null;
  if cur is null then
    if p_expected_version <> 0 then
      raise exception 'The plan no longer exists — read it again' using errcode = 'P0002';
    end if;
    insert into house_plans (company_id, project_id, title, model, version, code_fails, code_warns)
      values (cid, p_project_id, coalesce(p_title, ''), p_model, 1, p_code_fails, p_code_warns)
      returning * into r;
  else
    if cur <> p_expected_version then
      raise exception 'The plan changed since it was read (it is now version %) — read it again and re-apply', cur using errcode = '40001';
    end if;
    update house_plans
       set model = p_model,
           title = coalesce(p_title, title),
           version = cur + 1,
           code_fails = p_code_fails,
           code_warns = p_code_warns
     where project_id = p_project_id and deleted_at is null
     returning * into r;
    if r.id is null then
      raise exception 'Your role cannot edit this plan' using errcode = '42501';
    end if;
  end if;
  if p_summary is not null and p_summary <> '' then
    perform public.log_activity(p_project_id, 'house_plans', r.id, left(p_summary, 400), coalesce(p_source, 'ui'));
  end if;
  return r;
end $$;

revoke all on function public.save_house_plan(uuid, int, jsonb, text, text, int, int, text) from public, anon;
grant execute on function public.save_house_plan(uuid, int, jsonb, text, text, int, int, text) to authenticated;

-- ----------------------------------------------------------------------------
-- Realtime: the Plan tab reloads when Bob (or anyone) saves
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['house_plans'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
    execute format('alter table public.%I replica identity full', t);
  end loop;
end $$;
