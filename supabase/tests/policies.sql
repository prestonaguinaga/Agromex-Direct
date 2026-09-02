-- ============================================================================
-- Policy scenario tests. Runs after local-stubs.sql + migrations on a plain
-- PostgreSQL (see run-local.sh). Every block raises on failure.
--
-- Cast: A = owner · B = estimator · C = employee (assigned later) · D = outsider
-- Fixed ids live in session settings (test.*) because psql does not
-- interpolate :variables inside dollar-quoted DO blocks.
-- ============================================================================
\set ON_ERROR_STOP on

create schema if not exists test;

create or replace function test.u(name text) returns uuid
language sql stable as $$ select current_setting('test.' || name)::uuid $$;

create or replace function test.as_user(uid uuid) returns void
language sql as $$
  select set_config('request.jwt.claims',
                    case when uid is null then '' else json_build_object('sub', uid, 'role', 'authenticated')::text end,
                    false);
$$;

create or replace function test.expect_error(stmt text, code text) returns void
language plpgsql as $$
begin
  execute stmt;
  raise exception 'expected error % but statement succeeded: %', code, stmt;
exception
  when others then
    if sqlstate = 'P0001' and sqlerrm like 'expected error%' then raise; end if;
    if sqlstate <> code then
      raise exception 'expected % but got % (%) for: %', code, sqlstate, sqlerrm, stmt;
    end if;
end $$;

grant usage on schema test to authenticated;
grant execute on all functions in schema test to authenticated;

select set_config('test.A',   '11111111-1111-1111-1111-111111111111', false);
select set_config('test.B',   '22222222-2222-2222-2222-222222222222', false);
select set_config('test.C',   '33333333-3333-3333-3333-333333333333', false);
select set_config('test.D',   '44444444-4444-4444-4444-444444444444', false);
select set_config('test.PID', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
select set_config('test.EID', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', false);
select set_config('test.S1',  'cccccccc-cccc-cccc-cccc-cccccccccccc', false);
select set_config('test.I1',  'dddddddd-dddd-dddd-dddd-dddddddddddd', false);
select set_config('test.I2',  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', false);
select set_config('test.O1',  'ffffffff-ffff-ffff-ffff-ffffffffffff', false);
select set_config('test.O2',  '99999999-9999-9999-9999-999999999999', false);
select set_config('test.TL',  '55555555-5555-5555-5555-555555555555', false);
select set_config('test.T1',  '66666666-6666-6666-6666-666666666666', false);
select set_config('test.BG',  '77777777-7777-7777-7777-777777777777', false);
select set_config('test.BL',  '88888888-8888-8888-8888-888888888888', false);

-- Auth users exist before anything else (the trigger creates their profiles).
insert into auth.users (id, email, raw_user_meta_data) values
  (test.u('A'), 'owner@example.com',     '{"full_name":"Alma Owner"}'),
  (test.u('B'), 'estimator@example.com', '{"full_name":"Bea Estimator"}'),
  (test.u('C'), 'employee@example.com',  '{"full_name":"Cruz Employee"}'),
  (test.u('D'), 'outsider@example.com',  '{}');

do $$ begin
  assert (select count(*) from public.profiles) = 4, 'profiles created by trigger';
end $$;

-- ── A bootstraps the company ─────────────────────────────────────────────────
set role authenticated;
select test.as_user(test.u('A'));
select set_config('test.CID', public.bootstrap_company('Monarch Development LLC', 'MONARCH', 'America/Chicago')::text, false);
select test.expect_error('select public.bootstrap_company(''Again'')', '42501');

do $$ declare ctx jsonb; begin
  ctx := public.my_context();
  assert ctx->'membership'->>'role' = 'owner', 'A is owner';
  assert (ctx->'company'->>'id')::uuid = test.u('CID'), 'company in context';
  assert jsonb_array_length(ctx->'capabilities') = (select count(*) from authz.capabilities()), 'owner has every capability';
end $$;

-- Invitations for existing accounts take effect immediately.
insert into public.invitations (company_id, email, role, invited_by) values
  (test.u('CID'), 'Estimator@Example.com', 'estimator', test.u('A')),
  (test.u('CID'), 'employee@example.com', 'employee', test.u('A'));

do $$ begin
  assert (select count(*) from public.memberships where is_active) = 3, 'three active members';
  assert (select accepted_at is not null from public.invitations where lower(email) = 'estimator@example.com'), 'invitation marked accepted';
  assert (select role from public.memberships where user_id = test.u('B')) = 'estimator', 'B is estimator';
end $$;

-- ── A creates a project with a small sheet ───────────────────────────────────
do $$ declare r jsonb; s record; begin
  r := public.create_project(jsonb_build_object(
    'id', test.u('PID'), 'estimate_id', test.u('EID'), 'client_id', 'legacy-1',
    'project', jsonb_build_object('name', 'Smith kitchen', 'type', 'remodel', 'client_name', 'J. Smith'),
    'estimate', jsonb_build_object('tax_pct', 8.25),
    'sections', jsonb_build_object('upsert', jsonb_build_array(
      jsonb_build_object('id', test.u('S1'), 'name', 'Cabinets & counters', 'position', 0))),
    'items', jsonb_build_object('upsert', jsonb_build_array(
      jsonb_build_object('id', test.u('I1'), 'section_id', test.u('S1'), 'name', 'Drywall sheets', 'qty', 10, 'unit', 'sheet', 'active_option_id', test.u('O1'), 'position', 0),
      jsonb_build_object('id', test.u('I2'), 'section_id', test.u('S1'), 'name', 'Countertops', 'qty', 2, 'unit', 'sq ft', 'active_option_id', test.u('O2'), 'position', 1))),
    'options', jsonb_build_object('upsert', jsonb_build_array(
      jsonb_build_object('id', test.u('O1'), 'item_id', test.u('I1'), 'label', 'Home Depot', 'unit_price', 5, 'position', 0),
      jsonb_build_object('id', test.u('O2'), 'item_id', test.u('I2'), 'label', 'Quartz', 'unit_price', 100, 'position', 0)))
  ));
  assert (r->>'existing')::boolean = false, 'project created';
  select * into s from public.project_summary where id = test.u('PID');
  assert s.materials = 250.00, format('materials 250 got %s', s.materials);
  assert s.tax = 20.63, format('tax 20.63 got %s', s.tax);
  assert s.grand = 270.63, format('grand 270.63 got %s', s.grand);
  assert s.total_items = 2 and s.priced_items = 2, 'item counts';
  assert s.number = 1, 'project number assigned';
  assert (select created_by from public.projects where id = test.u('PID')) = test.u('A'), 'created_by stamped';
  assert exists (select 1 from public.audit_log where summary = 'Created project "Smith kitchen"' and actor_name = 'Alma Owner'), 'project creation audited';
end $$;

-- Retrying the same create (same id or same legacy id) is a no-op.
do $$ declare r jsonb; begin
  r := public.create_project(jsonb_build_object('id', test.u('PID'), 'project', jsonb_build_object('name', 'dup')));
  assert (r->>'existing')::boolean, 'same id → existing';
  r := public.create_project(jsonb_build_object('client_id', 'legacy-1', 'project', jsonb_build_object('name', 'dup')));
  assert (r->>'existing')::boolean and (r->>'project_id')::uuid = test.u('PID'), 'same legacy id → existing';
  assert (select count(*) from public.projects) = 1, 'no duplicate project';
end $$;

-- ── B (estimator) sees the project, edits a price, cannot touch budgets ──────
select test.as_user(test.u('B'));
do $$ begin
  assert (select count(*) from public.projects) = 1, 'estimator sees every project';
  assert (select count(*) from public.estimate_items) = 2, 'estimator sees items';
  perform public.apply_estimate_changes(jsonb_build_object(
    'estimate_id', test.u('EID'),
    'options', jsonb_build_object('upsert', jsonb_build_array(
      jsonb_build_object('id', test.u('O1'), 'item_id', test.u('I1'), 'label', 'Home Depot', 'unit_price', 6, 'position', 0)))));
  assert (select unit_price from public.estimate_item_options where id = test.u('O1')) = 6, 'price updated';
  assert exists (select 1 from public.audit_log
                 where entity_type = 'estimate_item_options' and field = 'unit_price'
                   and summary = 'Price for "Drywall sheets" changed from $5.00 to $6.00'
                   and actor_name = 'Bea Estimator' and project_id = test.u('PID')), 'price change audited with summary';
  assert (select updated_by from public.estimate_item_options where id = test.u('O1')) = test.u('B'), 'updated_by stamped';
  -- the same upsert again is harmless (idempotent retry)
  perform public.apply_estimate_changes(jsonb_build_object(
    'estimate_id', test.u('EID'),
    'options', jsonb_build_object('upsert', jsonb_build_array(
      jsonb_build_object('id', test.u('O1'), 'item_id', test.u('I1'), 'label', 'Home Depot', 'unit_price', 6, 'position', 0)))));
  assert (select count(*) from public.estimate_item_options) = 2, 'retry did not duplicate';
end $$;

-- Estimator can see budgets but not create them; cannot change the team.
select test.expect_error(
  format('insert into public.budgets (company_id, project_id) values (%L, %L)', test.u('CID'), test.u('PID')), '42501');
-- RLS filters rows the estimator may not update: the statement touches nothing.
do $$ begin
  update public.memberships set role = 'admin' where user_id = test.u('B');
  assert (select role from public.memberships where user_id = test.u('B')) = 'estimator', 'estimator cannot promote themselves';
end $$;

-- ── C (employee) sees nothing until assigned ─────────────────────────────────
select test.as_user(test.u('C'));
do $$ begin
  assert (select count(*) from public.projects) = 0, 'unassigned employee sees no projects';
  assert (select count(*) from public.project_summary) = 0, 'summary view hides too';
end $$;

select test.as_user(test.u('A'));
insert into public.project_members (project_id, user_id, company_id) values (test.u('PID'), test.u('C'), test.u('CID'));

select test.as_user(test.u('C'));
do $$ begin
  assert (select count(*) from public.projects) = 1, 'assigned employee sees the project';
  assert (select count(*) from public.estimate_items) = 0, 'employee cannot see estimate lines (no estimates.view)';
  assert (select count(*) from public.budget_lines) = 0, 'employee cannot see budgets';
  assert (select materials from public.project_summary where id = test.u('PID')) = 0, 'summary hides money from employees';
  insert into public.notes (company_id, project_id, author_id, body)
    values (test.u('CID'), test.u('PID'), test.u('C'), 'Framing inspection passed this morning.');
  insert into public.files (company_id, project_id, kind, bucket, storage_path, name, mime, uploaded_by)
    values (test.u('CID'), test.u('PID'), 'photo', 'photos', test.u('CID') || '/' || test.u('PID') || '/photo1.jpg', 'photo1.jpg', 'image/jpeg', test.u('C'));
  assert exists (select 1 from public.audit_log where entity_type = 'notes' and action = 'insert'
                 and summary like 'Added a note: "Framing inspection passed%' and actor_name = 'Cruz Employee'), 'note audited';
  assert exists (select 1 from public.audit_log where entity_type = 'files' and summary = 'Uploaded photo "photo1.jpg"'), 'photo audited';
end $$;
select test.expect_error(
  format('insert into public.notes (company_id, project_id, author_id, body) values (%L, %L, %L, ''spoof'')', test.u('CID'), test.u('PID'), test.u('A')), '42501');

-- Storage object policy: C may write under the assigned project, D may not.
insert into storage.objects (bucket_id, name, owner_id)
  values ('photos', test.u('CID') || '/' || test.u('PID') || '/photo1.jpg', test.u('C'));
select test.as_user(test.u('D'));
select test.expect_error(
  format('insert into storage.objects (bucket_id, name, owner_id) values (''photos'', %L, %L)',
         test.u('CID') || '/' || test.u('PID') || '/photo2.jpg', test.u('D')), '42501');
do $$ begin
  assert (select count(*) from storage.objects) = 0, 'outsider sees no objects';
  assert (select count(*) from public.projects) = 0, 'outsider sees no projects';
  assert jsonb_typeof(public.my_context()->'membership') = 'null', 'outsider has no membership';
  assert (public.my_context()->>'companies_exist')::boolean, 'outsider is told a company exists';
end $$;
select test.expect_error('select public.bootstrap_company(''Mine'')', '42501');

-- ── Tasks: manager creates, employee completes, employee cannot rename ───────
select test.as_user(test.u('A'));
insert into public.task_lists (id, company_id, project_id, name)
  values (test.u('TL'), test.u('CID'), test.u('PID'), 'Rough-in checklist');
insert into public.tasks (id, company_id, project_id, task_list_id, title, assignee_id)
  values (test.u('T1'), test.u('CID'), test.u('PID'), test.u('TL'), 'Pass framing inspection', test.u('C'));

select test.as_user(test.u('C'));
select test.expect_error(
  format('update public.tasks set title = ''renamed'' where id = %L', test.u('T1')), '42501');
select test.expect_error(
  format('insert into public.tasks (company_id, project_id, title) values (%L, %L, ''new'')', test.u('CID'), test.u('PID')), '42501');
do $$ begin
  update public.tasks set status = 'done' where id = test.u('T1');
  assert (select completed_by from public.tasks where id = test.u('T1')) = test.u('C'), 'completed_by stamped';
  -- 1 task done of 1, 0 of 2 items checked → 1/3 = 33.3
  assert (select progress_pct from public.projects where id = test.u('PID')) = 33.3,
    format('progress 33.3 got %s', (select progress_pct from public.projects where id = test.u('PID')));
  assert exists (select 1 from public.audit_log where summary = 'Completed task "Pass framing inspection"'), 'task completion audited';
end $$;

-- Checking an estimate item moves progress too (as the estimator).
select test.as_user(test.u('B'));
do $$ begin
  perform public.apply_estimate_changes(jsonb_build_object('estimate_id', test.u('EID'),
    'items', jsonb_build_object('upsert', jsonb_build_array(
      jsonb_build_object('id', test.u('I1'), 'section_id', test.u('S1'), 'name', 'Drywall sheets', 'qty', 10, 'unit', 'sheet', 'done', true, 'active_option_id', test.u('O1'), 'position', 0)))));
  assert (select progress_pct from public.projects where id = test.u('PID')) = 66.7,
    format('progress 66.7 got %s', (select progress_pct from public.projects where id = test.u('PID')));
  assert exists (select 1 from public.audit_log where summary = 'Checked off "Drywall sheets"'), 'check-off audited';
end $$;

-- ── Budgets: the headline audit sentence ─────────────────────────────────────
select test.as_user(test.u('A'));
do $$ begin
  insert into public.budgets (id, company_id, project_id) values (test.u('BG'), test.u('CID'), test.u('PID'));
  insert into public.budget_lines (id, company_id, budget_id, project_id, category, budgeted)
    values (test.u('BL'), test.u('CID'), test.u('BG'), test.u('PID'), 'Electrical', 26000);
  update public.budget_lines set budgeted = 28500 where id = test.u('BL');
  assert exists (select 1 from public.audit_log
                 where summary = 'Budget for Electrical (budgeted) changed from $26,000.00 to $28,500.00'
                   and actor_name = 'Alma Owner' and old_value = '26000.00'::jsonb and new_value = '28500.00'::jsonb),
    'budget change sentence';
end $$;
-- Only one active budget per project.
select test.expect_error(
  format('insert into public.budgets (company_id, project_id) values (%L, %L)', test.u('CID'), test.u('PID')), '23505');

-- ── Team guard rails ─────────────────────────────────────────────────────────
select test.expect_error(
  format('update public.memberships set is_active = false where user_id = %L', test.u('A')), '42501');  -- self / last owner
do $$ begin
  update public.memberships set role = 'project_manager' where user_id = test.u('B');
  assert exists (select 1 from public.audit_log where summary = 'Changed role of Bea Estimator from estimator to project manager'), 'role change audited';
end $$;
select test.as_user(test.u('B'));
do $$ begin
  assert (select count(*) from public.budget_lines) = 1, 'project manager now sees budgets';
  update public.budget_lines set actual = 1000 where id = test.u('BL');
  assert (select actual from public.budget_lines where id = test.u('BL')) = 1000, 'PM can edit budgets';
end $$;

-- ── Audit visibility follows scope ───────────────────────────────────────────
select test.as_user(test.u('C'));
do $$ begin
  assert (select count(*) from public.audit_log where project_id is distinct from test.u('PID')) = 0, 'employee only sees own project activity';
  assert (select count(*) from public.audit_log where project_id = test.u('PID')) > 0, 'employee sees project activity';
end $$;

-- ── Soft delete hides everything downstream ──────────────────────────────────
select test.as_user(test.u('A'));
update public.projects set deleted_at = now() where id = test.u('PID');
select test.as_user(test.u('B'));
do $$ begin
  assert (select count(*) from public.projects) = 0, 'deleted project hidden';
  assert (select count(*) from public.estimate_items) = 0, 'its items hidden';
  assert (select count(*) from public.notes) = 0, 'its notes hidden';
end $$;

reset role;
do $$ begin
  assert exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'estimate_items'), 'realtime publication';
  assert exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'audit_log'), 'audit realtime';
end $$;
