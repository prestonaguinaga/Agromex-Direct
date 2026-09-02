-- ============================================================================
-- Monarch Admin · migration 0009 · Bob's Daily Brief
-- A server-side, scheduled summary for the owner and project managers:
--   * daily_brief_settings — one row per company: enabled, delivery time,
--     timezone, recipients, which sections to include (never hard-coded);
--   * daily_briefs — every brief ever generated (facts, the rendered
--     document, Bob's narrative), one per company per local day per kind, so a
--     retried scheduler run can never produce a second one;
--   * daily_brief_deliveries — one row per brief per recipient, so a retried
--     run can never send a second email;
--   * leads and subcontractor_applications — the inboxes the brief reports on
--     (intake forms arrive in a later phase; the tables are ready now);
--   * capabilities briefs.view, leads.view, leads.manage.
-- Briefs are written only by the server process (service role); people read
-- them through row-level security like everything else.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Capabilities
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
    'estimates.view','estimates.edit','budgets.view','budgets.edit',
    'tasks.manage','tasks.complete','progress.override','notes.create','notes.manage',
    'files.view','files.upload','files.delete','subcontractors.view','subcontractors.manage',
    'leads.view','leads.manage','briefs.view',
    'team.view','audit.view_project','bob.use'])
  union all
  select 'estimator', unnest(array[
    'projects.view_all','projects.create','estimates.view','estimates.edit','budgets.view',
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
-- Settings (one row per company; created on first save)
-- ----------------------------------------------------------------------------
create table public.daily_brief_settings (
  company_id                  uuid primary key references public.companies (id) on delete cascade,
  enabled                     boolean not null default false,
  delivery_time               time not null default '07:00',
  timezone                    text not null default 'America/Chicago',
  recipients                  text[] not null default '{}',
  include_budget              boolean not null default true,
  include_applications        boolean not null default true,
  include_leads               boolean not null default true,
  include_completed_projects  boolean not null default false,
  include_photo_previews      boolean not null default false,
  -- The scheduler stamps these on every check-in, so the Settings sheet can
  -- show that the cron job is alive even on days nothing was due.
  last_run_at                 timestamptz,
  last_run_note               text not null default '',
  created_at                  timestamptz not null default now(),
  created_by                  uuid,
  updated_at                  timestamptz not null default now(),
  updated_by                  uuid
);
create trigger daily_brief_settings_touch before insert or update on public.daily_brief_settings
  for each row execute function public.touch_row();
create trigger daily_brief_settings_audit after insert or update on public.daily_brief_settings
  for each row execute function audit.row_change(
    'enabled', 'delivery_time', 'timezone', 'recipients', 'include_budget', 'include_applications',
    'include_leads', 'include_completed_projects', 'include_photo_previews');

-- ----------------------------------------------------------------------------
-- Briefs (history) and deliveries (one per recipient)
-- ----------------------------------------------------------------------------
create table public.daily_briefs (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies (id) on delete cascade,
  brief_date         date not null,                       -- local date in the brief's timezone
  kind               text not null default 'scheduled' check (kind in ('scheduled', 'manual')),
  timezone           text not null,
  status             text not null default 'generating' check (status in ('generating', 'ready', 'failed')),
  window_start       timestamptz,
  window_end         timestamptz,
  previous_brief_id  uuid references public.daily_briefs (id) on delete set null,
  settings           jsonb not null default '{}'::jsonb,   -- snapshot used for this brief
  facts              jsonb not null default '{}'::jsonb,   -- the data the brief was built from
  doc                jsonb not null default '{}'::jsonb,   -- the rendered document (sections, items, links)
  narrative          text not null default '',             -- Bob's short take (model-written, facts-only)
  summary            text not null default '',             -- one line for the dashboard card
  attention_count    int not null default 0,
  error              text,
  requested_by       uuid,                                  -- manual runs
  started_at         timestamptz not null default now(),
  generated_at       timestamptz,
  created_at         timestamptz not null default now()
);
-- The idempotency rule: one brief per company per local day per kind.
create unique index daily_briefs_one_per_day on public.daily_briefs (company_id, brief_date, kind);
create index daily_briefs_company_idx on public.daily_briefs (company_id, brief_date desc);

create table public.daily_brief_deliveries (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies (id) on delete cascade,
  brief_id         uuid not null references public.daily_briefs (id) on delete cascade,
  recipient_email  text not null,
  status           text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  provider_id      text,
  error            text,
  attempts         int not null default 0,
  attempted_at     timestamptz,
  sent_at          timestamptz,
  created_at       timestamptz not null default now(),
  unique (brief_id, recipient_email)
);

-- ----------------------------------------------------------------------------
-- Inboxes the brief reports on. Public intake forms are a later phase; until
-- then rows arrive by hand or through an integration.
-- ----------------------------------------------------------------------------
create table public.leads (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id) on delete cascade,
  name          text not null,
  email         text not null default '',
  phone         text not null default '',
  address       text not null default '',
  message       text not null default '',
  source        text not null default 'manual',
  status        text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'closed', 'spam')),
  assigned_to   uuid references public.profiles (id) on delete set null,
  project_id    uuid references public.projects (id) on delete set null,
  notes         text not null default '',
  created_at    timestamptz not null default now(),
  created_by    uuid,
  updated_at    timestamptz not null default now(),
  updated_by    uuid
);
create index leads_company_idx on public.leads (company_id, created_at desc);
create trigger leads_touch before insert or update on public.leads
  for each row execute function public.touch_row();
create trigger leads_audit after insert or update on public.leads
  for each row execute function audit.row_change('status', 'assigned_to');

create table public.subcontractor_applications (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies (id) on delete cascade,
  company_name   text not null,
  contact_name   text not null default '',
  trade          text not null default '',
  phone          text not null default '',
  email          text not null default '',
  message        text not null default '',
  source         text not null default 'manual',
  status         text not null default 'new' check (status in ('new', 'reviewing', 'accepted', 'declined')),
  subcontractor_id uuid references public.subcontractors (id) on delete set null,
  reviewed_by    uuid references public.profiles (id) on delete set null,
  reviewed_at    timestamptz,
  notes          text not null default '',
  created_at     timestamptz not null default now(),
  created_by     uuid,
  updated_at     timestamptz not null default now(),
  updated_by     uuid
);
create index subcontractor_applications_company_idx on public.subcontractor_applications (company_id, created_at desc);
create trigger subcontractor_applications_touch before insert or update on public.subcontractor_applications
  for each row execute function public.touch_row();
create trigger subcontractor_applications_audit after insert or update on public.subcontractor_applications
  for each row execute function audit.row_change('status');

-- Accepting or declining an application is a final status: stamp who and when.
create or replace function public.subcontractor_applications_review() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.status in ('accepted', 'declined') and old.status not in ('accepted', 'declined') then
    new.reviewed_by := coalesce(new.reviewed_by, auth.uid());
    new.reviewed_at := coalesce(new.reviewed_at, now());
  end if;
  return new;
end $$;
create trigger subcontractor_applications_review before update on public.subcontractor_applications
  for each row execute function public.subcontractor_applications_review();

-- ----------------------------------------------------------------------------
-- Row-level security
-- ----------------------------------------------------------------------------
alter table public.daily_brief_settings enable row level security;
alter table public.daily_briefs enable row level security;
alter table public.daily_brief_deliveries enable row level security;
alter table public.leads enable row level security;
alter table public.subcontractor_applications enable row level security;

create policy daily_brief_settings_select on public.daily_brief_settings for select to authenticated
  using (authz.has_cap(company_id, 'briefs.view') or authz.has_cap(company_id, 'settings.manage'));
create policy daily_brief_settings_write on public.daily_brief_settings for all to authenticated
  using (authz.has_cap(company_id, 'settings.manage'))
  with check (authz.has_cap(company_id, 'settings.manage'));

-- Briefs are produced by the server process only; people never write them.
create policy daily_briefs_select on public.daily_briefs for select to authenticated
  using (authz.has_cap(company_id, 'briefs.view'));

create policy daily_brief_deliveries_select on public.daily_brief_deliveries for select to authenticated
  using (authz.has_cap(company_id, 'settings.manage'));

create policy leads_select on public.leads for select to authenticated
  using (authz.has_cap(company_id, 'leads.view'));
create policy leads_write on public.leads for all to authenticated
  using (authz.has_cap(company_id, 'leads.manage'))
  with check (authz.has_cap(company_id, 'leads.manage'));

create policy subcontractor_applications_select on public.subcontractor_applications for select to authenticated
  using (authz.has_cap(company_id, 'subcontractors.view'));
create policy subcontractor_applications_write on public.subcontractor_applications for all to authenticated
  using (authz.has_cap(company_id, 'subcontractors.manage'))
  with check (authz.has_cap(company_id, 'subcontractors.manage'));
