-- ============================================================================
-- Monarch Admin · migration 0001 · foundation
-- Schemas, generic triggers, identity (companies / profiles / memberships /
-- invitations), the role → capability matrix, and the authz helper functions
-- every row-level-security policy is built from.
--
-- Conventions used by every migration in this folder:
--   * uuid primary keys generated client-side or by gen_random_uuid(), so a
--     retried save upserts the same row instead of creating a duplicate.
--   * company_id on every business table (single company today, multi-tenant
--     ready), created_at / updated_at / created_by / updated_by maintained by
--     the touch_row() trigger below.
--   * RLS is enabled on every table; a table with no policy is unreadable.
--   * authz.* functions are SECURITY DEFINER so policies never recurse into
--     the tables they protect, and they pin search_path to defeat spoofing.
-- ============================================================================

create extension if not exists pgcrypto;

create schema if not exists authz;
create schema if not exists audit;
grant usage on schema authz to anon, authenticated, service_role;
grant usage on schema audit to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Generic row bookkeeping: created_by / updated_at / updated_by.
-- Works on any table that has those columns (checked at runtime).
-- ----------------------------------------------------------------------------
create or replace function public.touch_row() returns trigger
language plpgsql as $$
declare
  j jsonb := to_jsonb(new);
  patch jsonb := '{}'::jsonb;
begin
  if tg_op = 'INSERT' then
    if (j ? 'created_by') and (j->>'created_by') is null then
      patch := patch || jsonb_build_object('created_by', auth.uid());
    end if;
  end if;
  if j ? 'updated_at' then patch := patch || jsonb_build_object('updated_at', now()); end if;
  if (j ? 'updated_by') and auth.uid() is not null then
    patch := patch || jsonb_build_object('updated_by', auth.uid());
  end if;
  if patch <> '{}'::jsonb then
    new := jsonb_populate_record(new, patch);
  end if;
  return new;
end $$;

-- ----------------------------------------------------------------------------
-- Roles
-- ----------------------------------------------------------------------------
create type public.role_key as enum
  ('owner', 'admin', 'project_manager', 'estimator', 'employee', 'read_only');

-- ----------------------------------------------------------------------------
-- Identity tables
-- ----------------------------------------------------------------------------
create table public.companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  short_name  text not null default 'MONARCH',
  timezone    text not null default 'America/Chicago',
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text,
  full_name     text,
  phone         text,
  avatar_path   text,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.memberships (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        public.role_key not null default 'employee',
  is_active   boolean not null default true,
  invited_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid,
  unique (company_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id) where is_active;

create table public.invitations (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies (id) on delete cascade,
  email             text not null,
  role              public.role_key not null default 'employee',
  invited_by        uuid references public.profiles (id),
  created_at        timestamptz not null default now(),
  accepted_at       timestamptz,
  accepted_user_id  uuid
);
create unique index invitations_pending_email_idx
  on public.invitations (company_id, lower(email)) where accepted_at is null;

create table public.role_permissions (
  company_id  uuid not null references public.companies (id) on delete cascade,
  role        public.role_key not null,
  capability  text not null,
  allowed     boolean not null default false,
  updated_at  timestamptz not null default now(),
  updated_by  uuid,
  primary key (company_id, role, capability)
);

create trigger companies_touch before insert or update on public.companies
  for each row execute function public.touch_row();
create trigger profiles_touch before insert or update on public.profiles
  for each row execute function public.touch_row();
create trigger memberships_touch before insert or update on public.memberships
  for each row execute function public.touch_row();
create trigger role_permissions_touch before insert or update on public.role_permissions
  for each row execute function public.touch_row();

-- ----------------------------------------------------------------------------
-- Capability catalogue and the default matrix (seeded per company; the Owner
-- edits role_permissions later — the Owner role itself always has everything).
-- ----------------------------------------------------------------------------
create or replace function authz.capabilities() returns setof text
language sql immutable as $$
  values ('projects.view_all'), ('projects.create'), ('projects.edit'), ('projects.delete'),
         ('estimates.view'), ('estimates.edit'),
         ('budgets.view'), ('budgets.edit'),
         ('tasks.manage'), ('tasks.complete'),
         ('notes.create'), ('notes.manage'),
         ('files.view'), ('files.upload'), ('files.delete'),
         ('team.view'), ('team.manage'), ('permissions.manage'),
         ('audit.view_all'), ('audit.view_project'),
         ('settings.manage')
$$;

create or replace function authz.default_grants() returns table (role public.role_key, capability text)
language sql immutable as $$
  -- admin: everything except editing the permission matrix
  select 'admin'::public.role_key, c from authz.capabilities() c where c <> 'permissions.manage'
  union all
  select 'project_manager', unnest(array[
    'projects.view_all','projects.create','projects.edit',
    'estimates.view','estimates.edit','budgets.view','budgets.edit',
    'tasks.manage','tasks.complete','notes.create','notes.manage',
    'files.view','files.upload','files.delete','team.view','audit.view_project'])
  union all
  select 'estimator', unnest(array[
    'projects.view_all','projects.create','estimates.view','estimates.edit','budgets.view',
    'tasks.complete','notes.create','files.view','files.upload','team.view','audit.view_project'])
  union all
  select 'employee', unnest(array[
    'tasks.complete','notes.create','files.view','files.upload','team.view','audit.view_project'])
  union all
  select 'read_only', unnest(array[
    'estimates.view','files.view','team.view','audit.view_project'])
$$;

create or replace function authz.seed_permissions(cid uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.role_permissions (company_id, role, capability, allowed)
  select cid, r.role, c.capability,
         exists (select 1 from authz.default_grants() g where g.role = r.role and g.capability = c.capability)
  from (select unnest(enum_range(null::public.role_key)) as role) r
  cross join (select authz.capabilities() as capability) c
  where r.role <> 'owner'
  on conflict (company_id, role, capability) do nothing;
$$;

-- ----------------------------------------------------------------------------
-- authz helpers (SECURITY DEFINER, STABLE)
-- ----------------------------------------------------------------------------
create or replace function authz.role_of(cid uuid) returns public.role_key
language sql stable security definer set search_path = '' as $$
  select m.role from public.memberships m
  where m.company_id = cid and m.user_id = auth.uid() and m.is_active
  limit 1
$$;

create or replace function authz.is_member(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.company_id = cid and m.user_id = auth.uid() and m.is_active)
$$;

create or replace function authz.has_cap(cid uuid, cap text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case
    when x.r is null then false
    when x.r = 'owner' then true
    else coalesce((select p.allowed from public.role_permissions p
                   where p.company_id = cid and p.role = x.r and p.capability = cap), false)
  end
  from (select authz.role_of(cid) as r) x
$$;

-- The company the signed-in user belongs to (first active membership).
create or replace function authz.my_company() returns uuid
language sql stable security definer set search_path = '' as $$
  select m.company_id from public.memberships m
  where m.user_id = auth.uid() and m.is_active
  order by m.created_at limit 1
$$;

-- True when the other user shares a company with the caller (profile visibility).
create or replace function authz.shares_company(other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships a
    join public.memberships b on b.company_id = a.company_id
    where a.user_id = auth.uid() and a.is_active and b.user_id = other and b.is_active)
$$;

grant execute on all functions in schema authz to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- New auth user → profile, and any pending invitation → membership.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  inv record;
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do update set email = excluded.email,
                                full_name = coalesce(public.profiles.full_name, excluded.full_name);

  for inv in
    select * from public.invitations i
    where lower(i.email) = lower(new.email) and i.accepted_at is null
  loop
    insert into public.memberships (company_id, user_id, role, invited_by)
    values (inv.company_id, new.id, inv.role, inv.invited_by)
    on conflict (company_id, user_id) do update
      set role = excluded.role, is_active = true;
    update public.invitations
      set accepted_at = now(), accepted_user_id = new.id
      where id = inv.id;
  end loop;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- An invitation for someone who already has an account takes effect at once.
create or replace function public.handle_new_invitation() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  existing uuid;
begin
  select id into existing from public.profiles where lower(email) = lower(new.email) limit 1;
  if existing is not null then
    insert into public.memberships (company_id, user_id, role, invited_by)
    values (new.company_id, existing, new.role, new.invited_by)
    on conflict (company_id, user_id) do update
      set role = excluded.role, is_active = true;
    new.accepted_at := now();
    new.accepted_user_id := existing;
  end if;
  return new;
end $$;

create trigger invitations_link_existing before insert on public.invitations
  for each row execute function public.handle_new_invitation();

-- ----------------------------------------------------------------------------
-- Membership guard rails: only an owner may create or change an owner; nobody
-- changes their own role; the last active owner cannot be removed.
-- ----------------------------------------------------------------------------
create or replace function public.memberships_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  my_role public.role_key;
begin
  if me is null then return new; end if;  -- service role / triggers
  my_role := authz.role_of(new.company_id);
  if tg_op = 'UPDATE' and new.user_id = me and (new.role <> old.role or new.is_active <> old.is_active) then
    raise exception 'You cannot change your own role or access.' using errcode = '42501';
  end if;
  -- Bootstrap: the first owner of a company that has none yet.
  if tg_op = 'INSERT' and new.role = 'owner' and not exists (
    select 1 from public.memberships m where m.company_id = new.company_id and m.role = 'owner') then
    return new;
  end if;
  if (new.role = 'owner' or (tg_op = 'UPDATE' and old.role = 'owner')) and my_role is distinct from 'owner' then
    raise exception 'Only an owner can assign or change the owner role.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and old.role = 'owner' and (new.role <> 'owner' or not new.is_active) then
    if (select count(*) from public.memberships m
        where m.company_id = new.company_id and m.role = 'owner' and m.is_active and m.id <> new.id) = 0 then
      raise exception 'A company must keep at least one active owner.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger memberships_guard before insert or update on public.memberships
  for each row execute function public.memberships_guard();

-- The permission matrix never carries an owner row; owners have everything.
create or replace function public.role_permissions_guard() returns trigger
language plpgsql as $$
begin
  if new.role = 'owner' then
    raise exception 'The owner role always has every capability.' using errcode = '42501';
  end if;
  if not exists (select 1 from authz.capabilities() c where c = new.capability) then
    raise exception 'Unknown capability %', new.capability using errcode = '22023';
  end if;
  return new;
end $$;

create trigger role_permissions_guard before insert or update on public.role_permissions
  for each row execute function public.role_permissions_guard();

-- ----------------------------------------------------------------------------
-- First-run bootstrap: the very first signed-in person creates the company and
-- becomes its owner. Refuses once any company exists (everyone else is invited).
-- ----------------------------------------------------------------------------
create or replace function public.bootstrap_company(
  p_name text,
  p_short_name text default 'MONARCH',
  p_timezone text default 'America/Chicago'
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  cid uuid;
begin
  if me is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  lock table public.companies in exclusive mode;
  if exists (select 1 from public.companies) then
    raise exception 'A company already exists. Ask its owner for an invitation.' using errcode = '42501';
  end if;
  insert into public.companies (name, short_name, timezone)
  values (coalesce(nullif(trim(p_name), ''), 'Monarch Development LLC'),
          coalesce(nullif(trim(p_short_name), ''), 'MONARCH'),
          coalesce(nullif(trim(p_timezone), ''), 'America/Chicago'))
  returning id into cid;
  insert into public.profiles (id, email)
  select u.id, u.email from auth.users u where u.id = me
  on conflict (id) do nothing;
  insert into public.memberships (company_id, user_id, role) values (cid, me, 'owner');
  perform authz.seed_permissions(cid);
  return cid;
end $$;

-- ----------------------------------------------------------------------------
-- One round trip for the app shell: who am I, which company, what may I do.
-- ----------------------------------------------------------------------------
create or replace function public.my_context() returns jsonb
language sql stable security definer set search_path = '' as $$
  with m as (
    select * from public.memberships
    where user_id = auth.uid() and is_active
    order by created_at limit 1
  )
  select jsonb_build_object(
    'user_id', auth.uid(),
    'companies_exist', exists (select 1 from public.companies),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'membership', (select to_jsonb(m) from m),
    'company', (select to_jsonb(c) from public.companies c where c.id = (select company_id from m)),
    'capabilities', coalesce((
      select jsonb_agg(cap order by cap) from (
        select c as cap from authz.capabilities() c
        where (select role from m) = 'owner'
        union
        select p.capability from public.role_permissions p
        where p.company_id = (select company_id from m) and p.role = (select role from m) and p.allowed
      ) caps), '[]'::jsonb)
  )
$$;

revoke all on function public.bootstrap_company(text, text, text) from public, anon;
revoke all on function public.my_context() from public, anon;
grant execute on function public.bootstrap_company(text, text, text) to authenticated;
grant execute on function public.my_context() to authenticated;

-- ----------------------------------------------------------------------------
-- Row-level security
-- ----------------------------------------------------------------------------
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.role_permissions enable row level security;

create policy companies_select on public.companies for select to authenticated
  using (authz.is_member(id));
create policy companies_update on public.companies for update to authenticated
  using (authz.has_cap(id, 'settings.manage'))
  with check (authz.has_cap(id, 'settings.manage'));

create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or authz.shares_company(id));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy memberships_select on public.memberships for select to authenticated
  using (user_id = auth.uid() or authz.has_cap(company_id, 'team.view'));
create policy memberships_insert on public.memberships for insert to authenticated
  with check (authz.has_cap(company_id, 'team.manage'));
create policy memberships_update on public.memberships for update to authenticated
  using (authz.has_cap(company_id, 'team.manage'))
  with check (authz.has_cap(company_id, 'team.manage'));

create policy invitations_all on public.invitations for all to authenticated
  using (authz.has_cap(company_id, 'team.manage'))
  with check (authz.has_cap(company_id, 'team.manage'));

create policy role_permissions_select on public.role_permissions for select to authenticated
  using (authz.is_member(company_id));
create policy role_permissions_write on public.role_permissions for all to authenticated
  using (authz.has_cap(company_id, 'permissions.manage'))
  with check (authz.has_cap(company_id, 'permissions.manage'));
