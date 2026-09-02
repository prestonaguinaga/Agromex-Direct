-- ============================================================================
-- Monarch Admin · migration 0002 · projects and estimates
-- The estimator's Project → sections → items → options model, normalised into
-- rows. The client keeps the exact TypeScript shapes from lib/types.ts as its
-- view model and writes changes through apply_estimate_changes() so every
-- save is one atomic, idempotent, RLS-checked round trip.
-- ============================================================================

create table public.projects (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies (id) on delete cascade,
  number           int,
  name             text not null,
  type             text not null default 'remodel' check (type in ('new-build', 'remodel')),
  status           text not null default 'estimating'
                   check (status in ('lead', 'estimating', 'active', 'on_hold', 'complete', 'archived')),
  template         text,
  client_name      text not null default '',
  client_phone     text not null default '',
  client_email     text not null default '',
  address          text not null default '',
  notes            text not null default '',
  plan_notes       text not null default '',
  start_date       date,
  target_end_date  date,
  actual_end_date  date,
  progress_pct     numeric(5,2) not null default 0,
  client_id        text,                       -- legacy browser id, for idempotent import
  created_at       timestamptz not null default now(),
  created_by       uuid,
  updated_at       timestamptz not null default now(),
  updated_by       uuid,
  deleted_at       timestamptz
);
create unique index projects_client_id_idx on public.projects (company_id, client_id) where client_id is not null;
create index projects_company_idx on public.projects (company_id, updated_at desc) where deleted_at is null;

create table public.project_members (
  project_id    uuid not null references public.projects (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  company_id    uuid not null references public.companies (id) on delete cascade,
  project_role  text not null default 'member' check (project_role in ('lead', 'member', 'viewer')),
  created_at    timestamptz not null default now(),
  created_by    uuid,
  primary key (project_id, user_id)
);
create index project_members_user_idx on public.project_members (user_id);

create table public.estimates (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies (id) on delete cascade,
  project_id       uuid not null references public.projects (id) on delete cascade,
  version          int not null default 1,
  status           text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'superseded')),
  tax_pct          numeric(6,3) not null default 8.25,
  waste_pct        numeric(6,3) not null default 0,
  labor_pct        numeric(6,3) not null default 0,
  contingency_pct  numeric(6,3) not null default 0,
  sqft             numeric,
  footprint_sqft   numeric,
  stories          numeric not null default 1,
  ceiling_ft       numeric not null default 9,
  bedrooms         numeric,
  bathrooms        numeric,
  roof_pitch       text not null default '6/12',
  created_at       timestamptz not null default now(),
  created_by       uuid,
  updated_at       timestamptz not null default now(),
  updated_by       uuid,
  deleted_at       timestamptz,
  unique (project_id, version)
);

create table public.estimate_sections (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies (id) on delete cascade,
  estimate_id  uuid not null references public.estimates (id) on delete cascade,
  name         text not null default '',
  position     int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  updated_by   uuid
);
create index estimate_sections_estimate_idx on public.estimate_sections (estimate_id, position);

create table public.estimate_items (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies (id) on delete cascade,
  estimate_id       uuid not null references public.estimates (id) on delete cascade,
  section_id        uuid not null references public.estimate_sections (id) on delete cascade,
  name              text not null default '',
  qty               numeric(12,3) not null default 1,
  unit              text not null default 'ea',
  done              boolean not null default false,
  note              text,
  active_option_id  uuid,
  position          int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  updated_by        uuid
);
create index estimate_items_estimate_idx on public.estimate_items (estimate_id, section_id, position);

create table public.estimate_item_options (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies (id) on delete cascade,
  estimate_id  uuid not null references public.estimates (id) on delete cascade,
  item_id      uuid not null references public.estimate_items (id) on delete cascade,
  label        text not null default '',
  url          text not null default '',
  unit_price   numeric(12,2),
  note         text,
  position     int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  updated_by   uuid
);
create index estimate_item_options_item_idx on public.estimate_item_options (item_id, position);
create index estimate_item_options_estimate_idx on public.estimate_item_options (estimate_id);

create trigger projects_touch before insert or update on public.projects
  for each row execute function public.touch_row();
create trigger project_members_touch before insert on public.project_members
  for each row execute function public.touch_row();
create trigger estimates_touch before insert or update on public.estimates
  for each row execute function public.touch_row();
create trigger estimate_sections_touch before insert or update on public.estimate_sections
  for each row execute function public.touch_row();
create trigger estimate_items_touch before insert or update on public.estimate_items
  for each row execute function public.touch_row();
create trigger estimate_item_options_touch before insert or update on public.estimate_item_options
  for each row execute function public.touch_row();

-- Project numbers (P-0001…) are display-only and assigned per company.
create or replace function public.projects_assign_number() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.number is null then
    select coalesce(max(p.number), 0) + 1 into new.number
    from public.projects p where p.company_id = new.company_id;
  end if;
  return new;
end $$;
create trigger projects_number before insert on public.projects
  for each row execute function public.projects_assign_number();

-- ----------------------------------------------------------------------------
-- Scope helpers
-- ----------------------------------------------------------------------------
-- A project is visible when the caller is an active member of its company AND
-- either their role sees every project or they are assigned to it.
create or replace function authz.on_project(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.projects p
    where p.id = pid and p.deleted_at is null
      and authz.is_member(p.company_id)
      and (authz.has_cap(p.company_id, 'projects.view_all')
           or exists (select 1 from public.project_members m
                      where m.project_id = pid and m.user_id = auth.uid())))
$$;

create or replace function authz.can_view_estimate(eid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.estimates e
    where e.id = eid and e.deleted_at is null
      and authz.on_project(e.project_id)
      and authz.has_cap(e.company_id, 'estimates.view'))
$$;

create or replace function authz.can_edit_estimate(eid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.estimates e
    where e.id = eid and e.deleted_at is null
      and authz.on_project(e.project_id)
      and authz.has_cap(e.company_id, 'estimates.edit'))
$$;

grant execute on all functions in schema authz to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Row-level security
-- ----------------------------------------------------------------------------
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.estimates enable row level security;
alter table public.estimate_sections enable row level security;
alter table public.estimate_items enable row level security;
alter table public.estimate_item_options enable row level security;

create policy projects_select on public.projects for select to authenticated
  using (authz.on_project(id));
create policy projects_insert on public.projects for insert to authenticated
  with check (authz.is_member(company_id) and authz.has_cap(company_id, 'projects.create') and deleted_at is null);
create policy projects_update on public.projects for update to authenticated
  using (authz.on_project(id)
         and (authz.has_cap(company_id, 'projects.edit') or created_by = auth.uid()))
  with check (authz.is_member(company_id)
              and (deleted_at is null or authz.has_cap(company_id, 'projects.delete')));
create policy projects_delete on public.projects for delete to authenticated
  using (authz.has_cap(company_id, 'projects.delete'));

create policy project_members_select on public.project_members for select to authenticated
  using (authz.on_project(project_id) or authz.has_cap(company_id, 'team.manage'));
create policy project_members_write on public.project_members for all to authenticated
  using (authz.on_project(project_id)
         and (authz.has_cap(company_id, 'projects.edit') or authz.has_cap(company_id, 'team.manage')))
  with check (authz.on_project(project_id)
              and (authz.has_cap(company_id, 'projects.edit') or authz.has_cap(company_id, 'team.manage')));

create policy estimates_select on public.estimates for select to authenticated
  using (deleted_at is null and authz.on_project(project_id) and authz.has_cap(company_id, 'estimates.view'));
create policy estimates_insert on public.estimates for insert to authenticated
  with check (authz.on_project(project_id) and authz.has_cap(company_id, 'estimates.edit'));
create policy estimates_update on public.estimates for update to authenticated
  using (authz.on_project(project_id) and authz.has_cap(company_id, 'estimates.edit'))
  with check (authz.on_project(project_id) and authz.has_cap(company_id, 'estimates.edit'));
create policy estimates_delete on public.estimates for delete to authenticated
  using (authz.on_project(project_id) and authz.has_cap(company_id, 'projects.delete'));

create policy estimate_sections_select on public.estimate_sections for select to authenticated
  using (authz.can_view_estimate(estimate_id));
create policy estimate_sections_write on public.estimate_sections for all to authenticated
  using (authz.can_edit_estimate(estimate_id))
  with check (authz.can_edit_estimate(estimate_id));

create policy estimate_items_select on public.estimate_items for select to authenticated
  using (authz.can_view_estimate(estimate_id));
create policy estimate_items_write on public.estimate_items for all to authenticated
  using (authz.can_edit_estimate(estimate_id))
  with check (authz.can_edit_estimate(estimate_id));

create policy estimate_item_options_select on public.estimate_item_options for select to authenticated
  using (authz.can_view_estimate(estimate_id));
create policy estimate_item_options_write on public.estimate_item_options for all to authenticated
  using (authz.can_edit_estimate(estimate_id))
  with check (authz.can_edit_estimate(estimate_id));

-- ----------------------------------------------------------------------------
-- apply_estimate_changes(payload) — the diff writer's single round trip.
-- SECURITY INVOKER: every statement inside is checked by the policies above.
-- Upserts are keyed on client-generated ids, so a retried save is harmless.
--
-- payload = {
--   estimate_id, project?: {name?, type?, client_name?, …}, estimate?: {tax_pct?, …},
--   sections?: {upsert?: [...], delete?: [ids]}, items?: {...}, options?: {...}
-- }
-- Absent keys leave a column untouched; an explicit null clears a nullable one.
-- ----------------------------------------------------------------------------
create or replace function public.apply_estimate_changes(p jsonb) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  eid   uuid := (p->>'estimate_id')::uuid;
  cid   uuid;
  pid   uuid;
  pr    jsonb := p->'project';
  es    jsonb := p->'estimate';
  r     jsonb;
  ids   uuid[];
  n     int;
  n_up  int := 0;
  n_del int := 0;
begin
  if eid is null then
    raise exception 'estimate_id is required' using errcode = '22023';
  end if;
  select e.company_id, e.project_id into cid, pid from estimates e where e.id = eid;
  if cid is null then
    raise exception 'Estimate % not found or not accessible', eid using errcode = 'P0002';
  end if;

  if jsonb_typeof(pr) = 'object' then
    update projects set
      name         = case when pr ? 'name'         then coalesce(pr->>'name', name)        else name end,
      type         = case when pr ? 'type'         then coalesce(pr->>'type', type)        else type end,
      template     = case when pr ? 'template'     then pr->>'template'                    else template end,
      client_name  = case when pr ? 'client_name'  then coalesce(pr->>'client_name', '')   else client_name end,
      client_phone = case when pr ? 'client_phone' then coalesce(pr->>'client_phone', '')  else client_phone end,
      client_email = case when pr ? 'client_email' then coalesce(pr->>'client_email', '')  else client_email end,
      address      = case when pr ? 'address'      then coalesce(pr->>'address', '')       else address end,
      notes        = case when pr ? 'notes'        then coalesce(pr->>'notes', '')         else notes end,
      plan_notes   = case when pr ? 'plan_notes'   then coalesce(pr->>'plan_notes', '')    else plan_notes end
    where id = pid;
    if not found then
      raise exception 'Project is not editable with your role' using errcode = '42501';
    end if;
  end if;

  if jsonb_typeof(es) = 'object' then
    update estimates set
      tax_pct         = case when es ? 'tax_pct'         then coalesce((es->>'tax_pct')::numeric, 0)         else tax_pct end,
      waste_pct       = case when es ? 'waste_pct'       then coalesce((es->>'waste_pct')::numeric, 0)       else waste_pct end,
      labor_pct       = case when es ? 'labor_pct'       then coalesce((es->>'labor_pct')::numeric, 0)       else labor_pct end,
      contingency_pct = case when es ? 'contingency_pct' then coalesce((es->>'contingency_pct')::numeric, 0) else contingency_pct end,
      sqft            = case when es ? 'sqft'            then (es->>'sqft')::numeric                         else sqft end,
      footprint_sqft  = case when es ? 'footprint_sqft'  then (es->>'footprint_sqft')::numeric               else footprint_sqft end,
      stories         = case when es ? 'stories'         then coalesce((es->>'stories')::numeric, 1)         else stories end,
      ceiling_ft      = case when es ? 'ceiling_ft'      then coalesce((es->>'ceiling_ft')::numeric, 9)      else ceiling_ft end,
      bedrooms        = case when es ? 'bedrooms'        then (es->>'bedrooms')::numeric                     else bedrooms end,
      bathrooms       = case when es ? 'bathrooms'       then (es->>'bathrooms')::numeric                    else bathrooms end,
      roof_pitch      = case when es ? 'roof_pitch'      then coalesce(es->>'roof_pitch', '6/12')            else roof_pitch end
    where id = eid;
    if not found then
      raise exception 'Estimate is not editable with your role' using errcode = '42501';
    end if;
  end if;

  for r in select * from jsonb_array_elements(coalesce(p->'sections'->'upsert', '[]'::jsonb)) loop
    insert into estimate_sections (id, company_id, estimate_id, name, position)
    values ((r->>'id')::uuid, cid, eid, coalesce(r->>'name', ''), coalesce((r->>'position')::int, 0))
    on conflict (id) do update
      set name = excluded.name, position = excluded.position
      where estimate_sections.estimate_id = eid;
    n_up := n_up + 1;
  end loop;

  for r in select * from jsonb_array_elements(coalesce(p->'items'->'upsert', '[]'::jsonb)) loop
    insert into estimate_items
      (id, company_id, estimate_id, section_id, name, qty, unit, done, note, active_option_id, position)
    values
      ((r->>'id')::uuid, cid, eid, (r->>'section_id')::uuid,
       coalesce(r->>'name', ''), coalesce((r->>'qty')::numeric, 1), coalesce(r->>'unit', 'ea'),
       coalesce((r->>'done')::boolean, false), r->>'note', (r->>'active_option_id')::uuid,
       coalesce((r->>'position')::int, 0))
    on conflict (id) do update
      set section_id = excluded.section_id, name = excluded.name, qty = excluded.qty,
          unit = excluded.unit, done = excluded.done, note = excluded.note,
          active_option_id = excluded.active_option_id, position = excluded.position
      where estimate_items.estimate_id = eid;
    n_up := n_up + 1;
  end loop;

  for r in select * from jsonb_array_elements(coalesce(p->'options'->'upsert', '[]'::jsonb)) loop
    insert into estimate_item_options
      (id, company_id, estimate_id, item_id, label, url, unit_price, note, position)
    values
      ((r->>'id')::uuid, cid, eid, (r->>'item_id')::uuid,
       coalesce(r->>'label', ''), coalesce(r->>'url', ''), (r->>'unit_price')::numeric,
       r->>'note', coalesce((r->>'position')::int, 0))
    on conflict (id) do update
      set item_id = excluded.item_id, label = excluded.label, url = excluded.url,
          unit_price = excluded.unit_price, note = excluded.note, position = excluded.position
      where estimate_item_options.estimate_id = eid;
    n_up := n_up + 1;
  end loop;

  select coalesce(array_agg(x::uuid), '{}'::uuid[]) into ids
    from jsonb_array_elements_text(coalesce(p->'options'->'delete', '[]'::jsonb)) x;
  delete from estimate_item_options where estimate_id = eid and id = any (ids);
  get diagnostics n = row_count; n_del := n_del + n;

  select coalesce(array_agg(x::uuid), '{}'::uuid[]) into ids
    from jsonb_array_elements_text(coalesce(p->'items'->'delete', '[]'::jsonb)) x;
  delete from estimate_items where estimate_id = eid and id = any (ids);
  get diagnostics n = row_count; n_del := n_del + n;

  select coalesce(array_agg(x::uuid), '{}'::uuid[]) into ids
    from jsonb_array_elements_text(coalesce(p->'sections'->'delete', '[]'::jsonb)) x;
  delete from estimate_sections where estimate_id = eid and id = any (ids);
  get diagnostics n = row_count; n_del := n_del + n;

  return jsonb_build_object('estimate_id', eid, 'upserted', n_up, 'deleted', n_del, 'saved_at', now());
end $$;

-- ----------------------------------------------------------------------------
-- create_project(payload) — project + first estimate + its sheet, atomically.
-- Idempotent on the caller-supplied id and on the legacy client_id (import).
-- ----------------------------------------------------------------------------
create or replace function public.create_project(p jsonb) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  cid      uuid := coalesce((p->>'company_id')::uuid, authz.my_company());
  pid      uuid := coalesce((p->>'id')::uuid, gen_random_uuid());
  eid      uuid := coalesce((p->>'estimate_id')::uuid, gen_random_uuid());
  legacy   text := nullif(p->>'client_id', '');
  pr       jsonb := coalesce(p->'project', '{}'::jsonb);
  es       jsonb := coalesce(p->'estimate', '{}'::jsonb);
  existing uuid;
begin
  if cid is null then
    raise exception 'You are not a member of a company' using errcode = '42501';
  end if;
  if legacy is not null then
    select id into existing from projects where company_id = cid and client_id = legacy;
    if existing is not null then
      return jsonb_build_object('project_id', existing, 'existing', true);
    end if;
  end if;
  if exists (select 1 from projects where id = pid) then
    return jsonb_build_object('project_id', pid, 'existing', true);
  end if;

  insert into projects
    (id, company_id, name, type, status, template, client_name, client_phone, client_email,
     address, notes, plan_notes, client_id, created_at)
  values
    (pid, cid,
     coalesce(nullif(pr->>'name', ''), 'Untitled project'),
     coalesce(pr->>'type', 'remodel'),
     coalesce(pr->>'status', 'estimating'),
     pr->>'template',
     coalesce(pr->>'client_name', ''), coalesce(pr->>'client_phone', ''), coalesce(pr->>'client_email', ''),
     coalesce(pr->>'address', ''), coalesce(pr->>'notes', ''), coalesce(pr->>'plan_notes', ''),
     legacy, coalesce((pr->>'created_at')::timestamptz, now()));

  insert into estimates
    (id, company_id, project_id, tax_pct, waste_pct, labor_pct, contingency_pct,
     sqft, footprint_sqft, stories, ceiling_ft, bedrooms, bathrooms, roof_pitch)
  values
    (eid, cid, pid,
     coalesce((es->>'tax_pct')::numeric, 8.25), coalesce((es->>'waste_pct')::numeric, 0),
     coalesce((es->>'labor_pct')::numeric, 0), coalesce((es->>'contingency_pct')::numeric, 0),
     (es->>'sqft')::numeric, (es->>'footprint_sqft')::numeric,
     coalesce((es->>'stories')::numeric, 1), coalesce((es->>'ceiling_ft')::numeric, 9),
     (es->>'bedrooms')::numeric, (es->>'bathrooms')::numeric, coalesce(es->>'roof_pitch', '6/12'));

  perform apply_estimate_changes(jsonb_build_object(
    'estimate_id', eid,
    'sections', p->'sections', 'items', p->'items', 'options', p->'options'));

  return jsonb_build_object('project_id', pid, 'estimate_id', eid, 'existing', false);
end $$;

revoke all on function public.apply_estimate_changes(jsonb) from public, anon;
revoke all on function public.create_project(jsonb) from public, anon;
grant execute on function public.apply_estimate_changes(jsonb) to authenticated;
grant execute on function public.create_project(jsonb) to authenticated;
