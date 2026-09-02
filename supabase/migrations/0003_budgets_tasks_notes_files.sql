-- ============================================================================
-- Monarch Admin · migration 0003 · budgets, tasks & checklists, notes, files
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Budgets: one active budget per project, made of lines (categories).
-- ----------------------------------------------------------------------------
create table public.budgets (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  project_id  uuid not null references public.projects (id) on delete cascade,
  name        text not null default 'Budget',
  status      text not null default 'active' check (status in ('active', 'archived')),
  notes       text not null default '',
  created_at  timestamptz not null default now(),
  created_by  uuid,
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);
create unique index budgets_one_active_idx on public.budgets (project_id) where status = 'active';

create table public.budget_lines (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies (id) on delete cascade,
  budget_id          uuid not null references public.budgets (id) on delete cascade,
  project_id         uuid not null references public.projects (id) on delete cascade,
  category           text not null,
  source_section_id  uuid,
  budgeted           numeric(12,2) not null default 0,
  committed          numeric(12,2) not null default 0,
  actual             numeric(12,2) not null default 0,
  notes              text not null default '',
  position           int not null default 0,
  created_at         timestamptz not null default now(),
  created_by         uuid,
  updated_at         timestamptz not null default now(),
  updated_by         uuid
);
create index budget_lines_budget_idx on public.budget_lines (budget_id, position);
create index budget_lines_project_idx on public.budget_lines (project_id);

-- ----------------------------------------------------------------------------
-- Tasks & checklists
-- ----------------------------------------------------------------------------
create table public.task_lists (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  project_id  uuid not null references public.projects (id) on delete cascade,
  name        text not null,
  kind        text not null default 'checklist' check (kind in ('checklist', 'punch_list', 'inspection', 'custom')),
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  created_by  uuid,
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);
create index task_lists_project_idx on public.task_lists (project_id, position);

create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id) on delete cascade,
  project_id    uuid not null references public.projects (id) on delete cascade,
  task_list_id  uuid references public.task_lists (id) on delete set null,
  title         text not null,
  description   text not null default '',
  status        text not null default 'todo' check (status in ('todo', 'in_progress', 'blocked', 'done')),
  priority      text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  assignee_id   uuid references public.profiles (id) on delete set null,
  due_date      date,
  completed_at  timestamptz,
  completed_by  uuid,
  is_milestone  boolean not null default false,
  position      int not null default 0,
  created_at    timestamptz not null default now(),
  created_by    uuid,
  updated_at    timestamptz not null default now(),
  updated_by    uuid
);
create index tasks_project_idx on public.tasks (project_id, task_list_id, position);
create index tasks_assignee_idx on public.tasks (assignee_id, due_date) where status <> 'done';

-- ----------------------------------------------------------------------------
-- Notes
-- ----------------------------------------------------------------------------
create table public.notes (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  project_id  uuid not null references public.projects (id) on delete cascade,
  author_id   uuid references public.profiles (id) on delete set null,
  body        text not null,
  pinned      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid,
  edited_at   timestamptz,
  deleted_at  timestamptz
);
create index notes_project_idx on public.notes (project_id, created_at desc) where deleted_at is null;

-- ----------------------------------------------------------------------------
-- Files (metadata; bytes live in Supabase Storage)
-- ----------------------------------------------------------------------------
create table public.files (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id) on delete cascade,
  project_id    uuid not null references public.projects (id) on delete cascade,
  kind          text not null check (kind in ('plan', 'document', 'photo', 'receipt')),
  bucket        text not null,
  storage_path  text not null unique,
  thumb_path    text,
  name          text not null,
  mime          text,
  size_bytes    bigint,
  width         int,
  height        int,
  taken_at      timestamptz,
  caption       text not null default '',
  uploaded_by   uuid references public.profiles (id) on delete set null,
  client_id     text,                        -- legacy plan-file id, for idempotent import
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  updated_by    uuid,
  deleted_at    timestamptz
);
create index files_project_idx on public.files (project_id, kind, created_at desc) where deleted_at is null;
create unique index files_client_id_idx on public.files (project_id, client_id) where client_id is not null;

create trigger budgets_touch before insert or update on public.budgets
  for each row execute function public.touch_row();
create trigger budget_lines_touch before insert or update on public.budget_lines
  for each row execute function public.touch_row();
create trigger task_lists_touch before insert or update on public.task_lists
  for each row execute function public.touch_row();
create trigger tasks_touch before insert or update on public.tasks
  for each row execute function public.touch_row();
create trigger notes_touch before insert or update on public.notes
  for each row execute function public.touch_row();
create trigger files_touch before insert or update on public.files
  for each row execute function public.touch_row();

-- ----------------------------------------------------------------------------
-- Task completion bookkeeping and the "complete-only" guard for roles that
-- may tick tasks but not manage them.
-- ----------------------------------------------------------------------------
create or replace function public.tasks_completion() returns trigger
language plpgsql as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
    new.completed_at := now();
    new.completed_by := auth.uid();
  elsif new.status <> 'done' then
    new.completed_at := null;
    new.completed_by := null;
  end if;
  return new;
end $$;
create trigger tasks_completion before insert or update on public.tasks
  for each row execute function public.tasks_completion();

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
     or new.task_list_id is distinct from old.task_list_id
     or new.assignee_id is distinct from old.assignee_id
     or new.due_date is distinct from old.due_date
     or new.priority <> old.priority
     or new.is_milestone <> old.is_milestone
     or new.position <> old.position
     or new.project_id <> old.project_id then
    raise exception 'Your role can only change the status of a task.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger tasks_guard before insert or update on public.tasks
  for each row execute function public.tasks_guard();

-- ----------------------------------------------------------------------------
-- Project progress = (done tasks + checked estimate items) / (all of them).
-- Recomputed by triggers so every screen and every device reads one number.
-- ----------------------------------------------------------------------------
create or replace function public.recompute_project_progress(pid uuid) returns void
language sql security definer set search_path = '' as $$
  update public.projects p
  set progress_pct = coalesce((
    select round(100.0 * (coalesce(t.done, 0) + coalesce(i.done, 0))
                 / nullif(coalesce(t.total, 0) + coalesce(i.total, 0), 0), 1)
    from (select count(*) as total, count(*) filter (where status = 'done') as done
          from public.tasks where project_id = pid) t,
         (select count(*) as total, count(*) filter (where it.done) as done
          from public.estimate_items it
          where it.estimate_id = (select e.id from public.estimates e
                                  where e.project_id = pid and e.deleted_at is null
                                  order by e.version desc limit 1)) i
  ), 0)
  where p.id = pid;
$$;

create or replace function public.tasks_progress() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.recompute_project_progress(coalesce(new.project_id, old.project_id));
  if tg_op = 'UPDATE' and new.project_id <> old.project_id then
    perform public.recompute_project_progress(old.project_id);
  end if;
  return null;
end $$;
create trigger tasks_progress after insert or update of status, project_id or delete on public.tasks
  for each row execute function public.tasks_progress();

create or replace function public.estimate_items_progress() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  pid uuid;
begin
  select e.project_id into pid from public.estimates e where e.id = coalesce(new.estimate_id, old.estimate_id);
  if pid is not null then perform public.recompute_project_progress(pid); end if;
  return null;
end $$;
create trigger estimate_items_progress after insert or update of done or delete on public.estimate_items
  for each row execute function public.estimate_items_progress();

-- ----------------------------------------------------------------------------
-- Row-level security
-- ----------------------------------------------------------------------------
alter table public.budgets enable row level security;
alter table public.budget_lines enable row level security;
alter table public.task_lists enable row level security;
alter table public.tasks enable row level security;
alter table public.notes enable row level security;
alter table public.files enable row level security;

create policy budgets_select on public.budgets for select to authenticated
  using (authz.on_project(project_id) and authz.has_cap(company_id, 'budgets.view'));
create policy budgets_write on public.budgets for all to authenticated
  using (authz.on_project(project_id) and authz.has_cap(company_id, 'budgets.edit'))
  with check (authz.on_project(project_id) and authz.has_cap(company_id, 'budgets.edit'));

create policy budget_lines_select on public.budget_lines for select to authenticated
  using (authz.on_project(project_id) and authz.has_cap(company_id, 'budgets.view'));
create policy budget_lines_write on public.budget_lines for all to authenticated
  using (authz.on_project(project_id) and authz.has_cap(company_id, 'budgets.edit'))
  with check (authz.on_project(project_id) and authz.has_cap(company_id, 'budgets.edit'));

create policy task_lists_select on public.task_lists for select to authenticated
  using (authz.on_project(project_id));
create policy task_lists_write on public.task_lists for all to authenticated
  using (authz.on_project(project_id) and authz.has_cap(company_id, 'tasks.manage'))
  with check (authz.on_project(project_id) and authz.has_cap(company_id, 'tasks.manage'));

create policy tasks_select on public.tasks for select to authenticated
  using (authz.on_project(project_id));
create policy tasks_insert on public.tasks for insert to authenticated
  with check (authz.on_project(project_id) and authz.has_cap(company_id, 'tasks.manage'));
create policy tasks_update on public.tasks for update to authenticated
  using (authz.on_project(project_id)
         and (authz.has_cap(company_id, 'tasks.manage') or authz.has_cap(company_id, 'tasks.complete')))
  with check (authz.on_project(project_id)
              and (authz.has_cap(company_id, 'tasks.manage') or authz.has_cap(company_id, 'tasks.complete')));
create policy tasks_delete on public.tasks for delete to authenticated
  using (authz.on_project(project_id) and authz.has_cap(company_id, 'tasks.manage'));

create policy notes_select on public.notes for select to authenticated
  using (deleted_at is null and authz.on_project(project_id));
create policy notes_insert on public.notes for insert to authenticated
  with check (authz.on_project(project_id) and authz.has_cap(company_id, 'notes.create')
              and author_id = auth.uid());
create policy notes_update on public.notes for update to authenticated
  using (authz.on_project(project_id)
         and (author_id = auth.uid() or authz.has_cap(company_id, 'notes.manage')))
  with check (authz.on_project(project_id)
              and (author_id = auth.uid() or authz.has_cap(company_id, 'notes.manage')));
create policy notes_delete on public.notes for delete to authenticated
  using (authz.on_project(project_id)
         and (author_id = auth.uid() or authz.has_cap(company_id, 'notes.manage')));

create policy files_select on public.files for select to authenticated
  using (deleted_at is null and authz.on_project(project_id) and authz.has_cap(company_id, 'files.view'));
create policy files_insert on public.files for insert to authenticated
  with check (authz.on_project(project_id) and authz.has_cap(company_id, 'files.upload')
              and uploaded_by = auth.uid());
create policy files_update on public.files for update to authenticated
  using (authz.on_project(project_id)
         and (uploaded_by = auth.uid() or authz.has_cap(company_id, 'files.delete')))
  with check (authz.on_project(project_id)
              and (uploaded_by = auth.uid() or authz.has_cap(company_id, 'files.delete')));
create policy files_delete on public.files for delete to authenticated
  using (authz.on_project(project_id)
         and (uploaded_by = auth.uid() or authz.has_cap(company_id, 'files.delete')));

-- ----------------------------------------------------------------------------
-- project_summary — one row per project for list screens, with the estimate
-- totals computed in SQL using the same formulas as lib/format.ts:computeTotals.
-- security_invoker: the caller's policies apply to every table underneath.
-- ----------------------------------------------------------------------------
create or replace view public.project_summary with (security_invoker = true) as
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
         count(*) filter (where t.status = 'done') as tasks_done
  from public.tasks t
  group by t.project_id
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
         coalesce(tt.tasks_total, 0)    as tasks_total,
         coalesce(tt.tasks_done, 0)     as tasks_done
  from public.projects p
  left join active_estimate e on e.project_id = p.id
  left join item_totals it on it.estimate_id = e.id
  left join task_totals tt on tt.project_id = p.id
  where p.deleted_at is null
),
money as (
  select b.*,
         b.materials * coalesce(b.waste_pct, 0) / 100 as waste
  from base b
),
money2 as (
  select m.*,
         (m.materials + m.waste) * coalesce(m.tax_pct, 0) / 100 as tax,
         m.materials * coalesce(m.labor_pct, 0) / 100          as labor
  from money m
)
select m.id, m.company_id, m.number, m.name, m.type, m.status, m.template,
       m.client_name, m.client_phone, m.client_email, m.address,
       m.start_date, m.target_end_date, m.actual_end_date, m.progress_pct,
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
       m.tasks_total, m.tasks_done
from money2 m;

grant select on public.project_summary to authenticated;
