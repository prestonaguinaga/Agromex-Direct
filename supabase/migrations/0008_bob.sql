-- ============================================================================
-- Monarch Admin · migration 0008 · Bob, the site assistant
-- Bob moves server-side and app-wide. This migration adds:
--   * bob.use — a capability so the Owner can switch Bob off per role;
--   * bob_conversations / bob_messages — conversation memory, private to the
--     person who had the conversation (RLS: own rows only). This is context,
--     never company fact: company information always comes from the tables
--     that hold it;
--   * bob_pending_actions — the confirmation gate. A guarded tool never runs
--     inside the chat loop; it writes a pending action with a plain-English
--     preview, the person confirms, the server re-checks their permissions
--     and executes. Content is frozen after insert; status only moves
--     pending → executed | declined | expired | failed;
--   * bob_user_preferences — per-user preferences Bob is explicitly asked to
--     remember (name, answer style). Never project or company data;
--   * audit rows carry source = 'bob' when a change came through Bob (the
--     server sends an x-app-source header; PostgREST exposes it to triggers).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Capability: bob.use (granted to every role by default)
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
         ('settings.manage'),
         ('bob.use')
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
    'team.view','audit.view_project','bob.use'])
  union all
  select 'estimator', unnest(array[
    'projects.view_all','projects.create','estimates.view','estimates.edit','budgets.view',
    'tasks.complete','notes.create','files.view','files.upload','subcontractors.view',
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
-- Conversation memory
-- ----------------------------------------------------------------------------
create table public.bob_conversations (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  project_id       uuid references public.projects (id) on delete cascade,   -- null = general thread
  title            text not null default '',
  -- Rolling summary of older turns (conversation context only). Refreshed by
  -- the server when a thread grows long; the summarised turns stay on disk.
  summary          text not null default '',
  summary_through  timestamptz,
  turns            int not null default 0,
  started_at       timestamptz not null default now(),
  last_message_at  timestamptz not null default now(),
  ended_at         timestamptz                                                 -- "New conversation" sets this
);
create index bob_conversations_user_idx
  on public.bob_conversations (user_id, project_id, last_message_at desc) where ended_at is null;

create table public.bob_messages (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies (id) on delete cascade,
  conversation_id  uuid not null references public.bob_conversations (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  role             text not null check (role in ('user', 'assistant', 'tool', 'event')),
  text             text not null default '',
  tool_name        text,
  tool_input       jsonb,
  tool_ok          boolean,
  input_tokens     int,
  output_tokens    int,
  created_at       timestamptz not null default now()
);
create index bob_messages_conversation_idx on public.bob_messages (conversation_id, created_at);
create index bob_messages_user_day_idx on public.bob_messages (user_id, created_at desc) where role = 'user';

create or replace function public.bob_messages_touch_conversation() returns trigger
language plpgsql as $$
begin
  update public.bob_conversations
     set last_message_at = greatest(last_message_at, new.created_at),
         turns = turns + case when new.role = 'user' then 1 else 0 end
   where id = new.conversation_id;
  return null;
end $$;
create trigger bob_messages_touch_conversation after insert on public.bob_messages
  for each row execute function public.bob_messages_touch_conversation();

-- ----------------------------------------------------------------------------
-- Pending actions (the confirmation gate)
-- ----------------------------------------------------------------------------
create table public.bob_pending_actions (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  conversation_id  uuid references public.bob_conversations (id) on delete set null,
  project_id       uuid references public.projects (id) on delete cascade,
  tool_name        text not null,
  tool_input       jsonb not null default '{}'::jsonb,
  preview          text not null,
  sensitivity      text not null
                   check (sensitivity in ('delete', 'money', 'permissions', 'email', 'applicant', 'other')),
  status           text not null default 'pending'
                   check (status in ('pending', 'executed', 'declined', 'expired', 'failed')),
  result           text,
  created_at       timestamptz not null default now(),
  expires_at       timestamptz not null default now() + interval '10 minutes',
  resolved_at      timestamptz
);
create index bob_pending_actions_user_idx on public.bob_pending_actions (user_id, status, created_at desc);

-- What Bob proposed is frozen; only the outcome can be recorded, once.
create or replace function public.bob_pending_actions_guard() returns trigger
language plpgsql as $$
begin
  if new.tool_name <> old.tool_name
     or new.tool_input <> old.tool_input
     or new.preview <> old.preview
     or new.sensitivity <> old.sensitivity
     or new.expires_at <> old.expires_at
     or new.user_id <> old.user_id
     or new.company_id <> old.company_id
     or new.project_id is distinct from old.project_id then
    raise exception 'A pending Bob action cannot be edited — decline it and ask Bob again.' using errcode = '42501';
  end if;
  if old.status <> 'pending' and new.status <> old.status then
    raise exception 'This Bob action has already been resolved.' using errcode = '42501';
  end if;
  if new.status <> 'pending' and new.resolved_at is null then
    new.resolved_at := now();
  end if;
  return new;
end $$;
create trigger bob_pending_actions_guard before update on public.bob_pending_actions
  for each row execute function public.bob_pending_actions_guard();

-- ----------------------------------------------------------------------------
-- Per-user preferences (explicitly remembered; never company data)
-- ----------------------------------------------------------------------------
create table public.bob_user_preferences (
  user_id      uuid primary key references public.profiles (id) on delete cascade,
  company_id   uuid not null references public.companies (id) on delete cascade,
  preferences  jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);
create trigger bob_user_preferences_touch before insert or update on public.bob_user_preferences
  for each row execute function public.touch_row();

-- ----------------------------------------------------------------------------
-- Row-level security: every Bob table is private to its person, and using
-- Bob at all needs the bob.use capability.
-- ----------------------------------------------------------------------------
alter table public.bob_conversations enable row level security;
alter table public.bob_messages enable row level security;
alter table public.bob_pending_actions enable row level security;
alter table public.bob_user_preferences enable row level security;

create policy bob_conversations_own on public.bob_conversations for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and authz.has_cap(company_id, 'bob.use'));

create policy bob_messages_own on public.bob_messages for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid()
              and authz.has_cap(company_id, 'bob.use')
              and exists (select 1 from public.bob_conversations c
                          where c.id = conversation_id and c.user_id = auth.uid()));

create policy bob_pending_actions_own on public.bob_pending_actions for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and authz.has_cap(company_id, 'bob.use'));

create policy bob_user_preferences_own on public.bob_user_preferences for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and authz.has_cap(company_id, 'bob.use'));

-- ----------------------------------------------------------------------------
-- Activity: a change that came through Bob is stamped source = 'bob'.
-- The server's Supabase client sends `x-app-source: bob`; PostgREST exposes
-- request headers to SQL as the request.headers setting. Only known values
-- are accepted, everything else reads as 'ui'.
-- ----------------------------------------------------------------------------
create or replace function audit.request_source() returns text
language plpgsql stable as $$
declare
  hdr text;
  src text;
begin
  src := nullif(current_setting('app.source', true), '');
  if src is null then
    begin
      hdr := nullif(current_setting('request.headers', true), '');
      if hdr is not null then
        src := nullif(hdr::jsonb ->> 'x-app-source', '');
      end if;
    exception when others then
      src := null;
    end;
  end if;
  return case when src in ('bob', 'import', 'system') then src else 'ui' end;
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
  src      text := audit.request_source();
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

-- log_activity() keeps its explicit p_source but falls back to the request header.
create or replace function public.log_activity(
  p_project_id uuid, p_entity_type text, p_entity_id uuid, p_summary text, p_source text default null
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
          p_summary, coalesce(p_source, audit.request_source()))
  returning id into new_id;
  return new_id;
end $$;
revoke all on function public.log_activity(uuid, text, uuid, text, text) from public, anon;
grant execute on function public.log_activity(uuid, text, uuid, text, text) to authenticated;
