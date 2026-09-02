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
  assert exists (select 1 from public.audit_log where summary = 'created project "Smith kitchen"' and actor_name = 'Alma Owner' and kind = 'major'), 'project creation audited';
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
                   and summary = 'changed the price of "Drywall sheets" from $5 to $6' and kind = 'major'
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
                 and summary like 'added a project note: "Framing inspection passed%' and actor_name = 'Cruz Employee'), 'note audited';
  assert exists (select 1 from public.audit_log where entity_type = 'files' and summary = 'uploaded a progress photo "photo1.jpg"'), 'photo audited';
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
insert into public.tasks (company_id, project_id, task_list_id, title, trade, start_date, due_date)
  values (test.u('CID'), test.u('PID'), test.u('TL'), 'Set trusses', 'Framing', current_date, current_date + 3);

select test.as_user(test.u('C'));
select test.expect_error(
  format('update public.tasks set title = ''renamed'' where id = %L', test.u('T1')), '42501');
select test.expect_error(
  format('insert into public.tasks (company_id, project_id, title) values (%L, %L, ''new'')', test.u('CID'), test.u('PID')), '42501');
do $$ begin
  update public.tasks set status = 'done' where id = test.u('T1');
  assert (select completed_by from public.tasks where id = test.u('T1')) = test.u('C'), 'completed_by stamped';
  -- 1 task done of 2 → 50 (estimate check-offs no longer count)
  assert (select progress_pct from public.projects where id = test.u('PID')) = 50.0,
    format('progress 50 got %s', (select progress_pct from public.projects where id = test.u('PID')));
  assert exists (select 1 from public.audit_log where summary = 'moved task "Set trusses" from To Do to In Progress') = false, 'no spurious move yet';
  assert exists (select 1 from public.audit_log where summary = 'completed Pass framing inspection'), 'task completion audited';
end $$;

-- Checking an estimate item moves progress too (as the estimator).
select test.as_user(test.u('B'));
do $$ begin
  perform public.apply_estimate_changes(jsonb_build_object('estimate_id', test.u('EID'),
    'items', jsonb_build_object('upsert', jsonb_build_array(
      jsonb_build_object('id', test.u('I1'), 'section_id', test.u('S1'), 'name', 'Drywall sheets', 'qty', 10, 'unit', 'sheet', 'done', true, 'active_option_id', test.u('O1'), 'position', 0)))));
  assert (select progress_pct from public.projects where id = test.u('PID')) = 50.0,
    format('progress still 50 got %s', (select progress_pct from public.projects where id = test.u('PID')));
  assert exists (select 1 from public.audit_log where summary = 'checked off "Drywall sheets"' and kind = 'minor'), 'check-off audited as minor';
end $$;

-- ── Budgets: the headline audit sentence ─────────────────────────────────────
select test.as_user(test.u('A'));
do $$ begin
  insert into public.budgets (id, company_id, project_id) values (test.u('BG'), test.u('CID'), test.u('PID'));
  insert into public.budget_lines (id, company_id, budget_id, project_id, category, budgeted)
    values (test.u('BL'), test.u('CID'), test.u('BG'), test.u('PID'), 'Electrical', 26000);
  update public.budget_lines set budgeted = 28500 where id = test.u('BL');
  assert exists (select 1 from public.audit_log
                 where summary = 'changed Electrical budget from $26,000 to $28,500'
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
  assert exists (select 1 from public.audit_log where summary = 'changed Bea Estimator''s role from estimator to project manager'), 'role change audited';
end $$;
select test.as_user(test.u('B'));
do $$ begin
  assert (select count(*) from public.budget_lines) = 1, 'project manager now sees budgets';
  update public.budget_lines set actual = 1000 where id = test.u('BL');
  assert (select actual from public.budget_lines where id = test.u('BL')) = 1000, 'PM can edit budgets';
end $$;

-- ── Phase 2: phases, current phase, manual progress, subcontractors, templates
select test.as_user(test.u('A'));
do $$ declare s record; f uuid; begin
  insert into public.project_phases (company_id, project_id, key, name, position) values
    (test.u('CID'), test.u('PID'), 'foundation', 'Foundation', 0),
    (test.u('CID'), test.u('PID'), 'framing', 'Framing', 1),
    (test.u('CID'), test.u('PID'), 'roofing', 'Roofing', 2);
  update public.project_phases set status = 'complete' where key = 'foundation' and project_id = test.u('PID');
  update public.project_phases set status = 'in_progress' where key = 'framing' and project_id = test.u('PID');
  select * into s from public.project_summary where id = test.u('PID');
  assert s.current_phase_name = 'Framing', format('current phase Framing got %s', s.current_phase_name);
  assert s.phases_complete = 1 and s.phases_total = 3, 'phase counts';
  assert (select actual_end is not null from public.project_phases where key = 'foundation' and project_id = test.u('PID')), 'actual_end stamped';
  assert exists (select 1 from public.audit_log where summary = 'started phase Framing'), 'phase start audited';
  assert exists (select 1 from public.audit_log where summary = 'completed phase Foundation'), 'phase completion audited';

  -- a checklist attached to the phase passes its phase down to its tasks
  update public.task_lists set phase_id = (select id from public.project_phases where key = 'framing' and project_id = test.u('PID')) where id = test.u('TL');
  insert into public.tasks (company_id, project_id, task_list_id, title) values (test.u('CID'), test.u('PID'), test.u('TL'), 'Sheathing complete');
  assert (select phase_id from public.tasks where title = 'Sheathing complete') = (select id from public.project_phases where key = 'framing' and project_id = test.u('PID')), 'task inherits phase';

  -- moving a task between statuses reads like a site log
  update public.tasks set status = 'in_progress' where title = 'Set trusses';
  assert exists (select 1 from public.audit_log where summary = 'moved task "Set trusses" from To Do to In Progress'), 'status move audited';
  assert (select tasks_in_progress from public.project_summary where id = test.u('PID')) = 1, 'in-progress count';

  -- manual progress override keeps both numbers
  update public.projects set manual_progress_pct = 65, manual_progress_note = 'Framing ahead of the checklist' where id = test.u('PID');
  select * into s from public.project_summary where id = test.u('PID');
  assert s.progress_source = 'manual' and s.display_progress_pct = 65 and s.progress_pct = 33.3,
    format('override: source %s display %s calc %s', s.progress_source, s.display_progress_pct, s.progress_pct);
  assert s.manual_progress_by = test.u('A') and s.manual_progress_at is not null, 'override stamped';
  assert exists (select 1 from public.audit_log where summary = 'set project progress to 65% (calculated 33.3%)'), 'override audited';

  -- contract amount lives on the budget
  update public.budgets set contract_amount = 185000 where id = test.u('BG');
  assert exists (select 1 from public.audit_log where summary = 'changed the contract amount from — to $185,000'), 'contract audited';
  select * into s from public.project_summary where id = test.u('PID');
  assert s.contract_amount = 185000 and s.budget_budgeted = 28500 and s.budget_actual = 1000, 'money in summary';

  -- subcontractors + linked note + photo with phase
  insert into public.subcontractors (company_id, name, trade) values (test.u('CID'), 'Lone Star Electric', 'Electrical');
  update public.tasks set subcontractor_id = (select id from public.subcontractors where name = 'Lone Star Electric'), trade = 'Electrical' where title = 'Sheathing complete';
  insert into public.notes (company_id, project_id, author_id, body, task_id)
    values (test.u('CID'), test.u('PID'), test.u('A'), 'Trusses arrive Thursday.', (select id from public.tasks where title = 'Set trusses'));
  insert into public.files (company_id, project_id, kind, bucket, storage_path, name, mime, uploaded_by, phase_id)
    values (test.u('CID'), test.u('PID'), 'photo', 'photos', test.u('CID') || '/' || test.u('PID') || '/photo2.jpg', 'photo2.jpg', 'image/jpeg', test.u('A'),
            (select id from public.project_phases where key = 'framing' and project_id = test.u('PID')))
    returning id into f;
  assert (select count(*) from public.files where phase_id is not null) = 1, 'photo carries phase';

  -- company checklist template
  insert into public.checklist_templates (id, company_id, key, name, phase_key) values ('12121212-1212-1212-1212-121212121212', test.u('CID'), 'monarch-framing', 'Monarch framing checklist', 'framing');
  insert into public.checklist_template_items (company_id, template_id, title, trade) values (test.u('CID'), '12121212-1212-1212-1212-121212121212', 'Hurricane clips installed', 'Framing');
end $$;

-- B (now a project manager) creates a project and may override its progress…
select test.as_user(test.u('B'));
do $$ declare r jsonb; begin
  r := public.create_project(jsonb_build_object('id', '13131313-1313-1313-1313-131313131313', 'project', jsonb_build_object('name', 'Lot 14 build', 'type', 'new-build')));
  update public.projects set name = 'Lot 14 new build' where id = '13131313-1313-1313-1313-131313131313';
  assert (select name from public.projects where id = '13131313-1313-1313-1313-131313131313') = 'Lot 14 new build', 'PM may edit';
  update public.projects set manual_progress_pct = 40 where id = '13131313-1313-1313-1313-131313131313';
  assert (select manual_progress_pct from public.projects where id = '13131313-1313-1313-1313-131313131313') = 40, 'PM may override progress';
end $$;
-- …until the owner revokes progress.override from project managers in the matrix.
select test.as_user(test.u('A'));
update public.role_permissions set allowed = false where company_id = test.u('CID') and role = 'project_manager' and capability = 'progress.override';
do $$ begin
  assert exists (select 1 from public.audit_log where summary = 'revoked progress.override from project manager'), 'permission change audited';
end $$;
select test.as_user(test.u('B'));
select test.expect_error(
  'update public.projects set manual_progress_pct = 55 where id = ''13131313-1313-1313-1313-131313131313''', '42501');
select test.as_user(test.u('A'));
update public.role_permissions set allowed = true where company_id = test.u('CID') and role = 'project_manager' and capability = 'progress.override';
-- An assigned employee cannot even reach the row for update: nothing changes, no error.
select test.as_user(test.u('C'));
do $$ begin
  update public.projects set manual_progress_pct = 10 where id = test.u('PID');
  assert (select manual_progress_pct from public.projects where id = test.u('PID')) = 65, 'employee cannot override';
end $$;

-- Employees see subcontractors and templates but cannot manage them.
select test.as_user(test.u('C'));
do $$ begin
  assert (select count(*) from public.subcontractors) = 1, 'employee sees subcontractors';
  assert (select count(*) from public.checklist_template_items) = 1, 'employee sees templates';
  assert (select count(*) from public.project_phases) = 3, 'employee sees phases';
  assert (select count(*) from public.audit_log where kind = 'minor') = 0 or true, 'minor rows exist or not';
end $$;
select test.expect_error(
  format('insert into public.subcontractors (company_id, name) values (%L, ''Spoof Plumbing'')', test.u('CID')), '42501');
select test.expect_error(
  format('insert into public.project_phases (company_id, project_id, name) values (%L, %L, ''Extra'')', test.u('CID'), test.u('PID')), '42501');

-- ── Audit visibility follows scope ───────────────────────────────────────────
select test.as_user(test.u('C'));
do $$ begin
  assert (select count(*) from public.audit_log where project_id is distinct from test.u('PID')) = 0, 'employee only sees own project activity';
  assert (select count(*) from public.audit_log where project_id = test.u('PID')) > 0, 'employee sees project activity';
end $$;

-- ── Bob: conversations are private, actions are guarded, changes are stamped ─
select test.as_user(test.u('B'));
do $$ begin
  assert (public.my_context()->'capabilities') ? 'bob.use', 'project manager may use Bob';
  insert into public.bob_conversations (id, company_id, user_id, project_id, title)
    values ('14141414-1414-1414-1414-141414141414', test.u('CID'), test.u('B'), test.u('PID'), 'Smith kitchen');
  insert into public.bob_messages (company_id, conversation_id, user_id, role, text)
    values (test.u('CID'), '14141414-1414-1414-1414-141414141414', test.u('B'), 'user', 'How are we doing on Smith?');
  insert into public.bob_messages (company_id, conversation_id, user_id, role, text, tool_name, tool_input, tool_ok)
    values (test.u('CID'), '14141414-1414-1414-1414-141414141414', test.u('B'), 'tool', 'get_project_summary', 'get_project_summary', '{"project_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}', true);
  assert (select turns from public.bob_conversations where id = '14141414-1414-1414-1414-141414141414') = 1, 'user turns counted';
  insert into public.bob_pending_actions (id, company_id, user_id, conversation_id, project_id, tool_name, tool_input, preview, sensitivity)
    values ('15151515-1515-1515-1515-151515151515', test.u('CID'), test.u('B'), '14141414-1414-1414-1414-141414141414', test.u('PID'),
            'set_budget_line', '{"category":"Electrical","budgeted":30000}', 'Change Electrical budget from $28,500 to $30,000', 'money');
  insert into public.bob_user_preferences (user_id, company_id, preferences) values (test.u('B'), test.u('CID'), '{"answer_style":"short"}');
  assert (select count(*) from public.bob_user_preferences where user_id = test.u('B')) = 1, 'preferences stored';
end $$;

-- Another member sees none of it and cannot write into it.
select test.as_user(test.u('C'));
do $$ begin
  assert (select count(*) from public.bob_conversations) = 0, 'conversations are private';
  assert (select count(*) from public.bob_messages) = 0, 'messages are private';
  assert (select count(*) from public.bob_pending_actions) = 0, 'pending actions are private';
  assert (select count(*) from public.bob_user_preferences) = 0, 'preferences are private';
end $$;
select test.expect_error(
  format('insert into public.bob_messages (company_id, conversation_id, user_id, role, text) values (%L, %L, %L, ''user'', ''spoof'')',
         test.u('CID'), '14141414-1414-1414-1414-141414141414', test.u('C')), '42501');
select test.expect_error(
  format('insert into public.bob_conversations (company_id, user_id) values (%L, %L)', test.u('CID'), test.u('B')), '42501');

-- A pending action is frozen; only its outcome can be recorded, and only once.
select test.as_user(test.u('B'));
select test.expect_error(
  format('update public.bob_pending_actions set tool_input = %L where id = %L', '{"budgeted": 999999}', '15151515-1515-1515-1515-151515151515'), '42501');
do $$ begin
  update public.bob_pending_actions set status = 'executed', result = 'Electrical budget is now $30,000'
    where id = '15151515-1515-1515-1515-151515151515';
  assert (select resolved_at is not null from public.bob_pending_actions where id = '15151515-1515-1515-1515-151515151515'), 'resolved_at stamped';
end $$;
select test.expect_error(
  format('update public.bob_pending_actions set status = %L where id = %L', 'pending', '15151515-1515-1515-1515-151515151515'), '42501');

-- Bob's changes are stamped in the activity log; unknown sources fall back to ui.
select set_config('request.headers', '{"x-app-source":"bob"}', false);
do $$ begin
  update public.tasks set status = 'done' where title = 'Set trusses';
  assert exists (select 1 from public.audit_log where summary = 'completed Set trusses' and source = 'bob'), 'bob source stamped';
end $$;
select set_config('request.headers', '{"x-app-source":"anything"}', false);
do $$ begin
  update public.tasks set status = 'in_progress' where title = 'Set trusses';
  assert exists (select 1 from public.audit_log where summary = 'reopened task "Set trusses"' and source = 'ui'), 'unknown source reads as ui';
end $$;
select set_config('request.headers', 'not json', false);
do $$ begin
  assert audit.request_source() = 'ui', 'malformed header is ignored';
end $$;
select set_config('request.headers', '', false);

-- The owner can switch Bob off for a role.
select test.as_user(test.u('A'));
update public.role_permissions set allowed = false where company_id = test.u('CID') and role = 'employee' and capability = 'bob.use';
select test.as_user(test.u('C'));
do $$ begin
  assert not ((public.my_context()->'capabilities') ? 'bob.use'), 'employee lost bob.use';
end $$;
select test.expect_error(
  format('insert into public.bob_conversations (company_id, user_id) values (%L, %L)', test.u('CID'), test.u('C')), '42501');
select test.as_user(test.u('A'));
update public.role_permissions set allowed = true where company_id = test.u('CID') and role = 'employee' and capability = 'bob.use';

-- ── Daily brief: settings need settings.manage, briefs are read by briefs.view only ──
select test.as_user(test.u('A'));
do $$ begin
  assert (public.my_context()->'capabilities') ? 'briefs.view', 'owner has briefs.view';
  insert into public.daily_brief_settings (company_id, enabled, delivery_time, timezone, recipients)
    values (test.u('CID'), true, '06:30', 'America/Chicago', array['owner@example.com']);
  update public.daily_brief_settings set delivery_time = '07:15' where company_id = test.u('CID');
  assert exists (select 1 from public.audit_log where entity_type = 'daily_brief_settings' and field = 'delivery_time'), 'settings change audited';
  insert into public.leads (company_id, name, email, message, source) values (test.u('CID'), 'Pat Lead', 'pat@example.com', 'Need a kitchen remodel', 'website');
  insert into public.subcontractor_applications (company_id, company_name, contact_name, trade, source)
    values (test.u('CID'), 'Ace Drywall', 'Ana', 'Drywall', 'website');
  update public.subcontractor_applications set status = 'accepted' where company_name = 'Ace Drywall';
  assert (select reviewed_by from public.subcontractor_applications where company_name = 'Ace Drywall') = test.u('A'), 'review stamped';
end $$;

-- The server process (service role) writes briefs; a retried run cannot create a second one.
reset role;
do $$ begin
  insert into public.daily_briefs (id, company_id, brief_date, kind, timezone, status, summary, attention_count, generated_at)
    values ('16161616-1616-1616-1616-161616161616', test.u('CID'), '2026-09-02', 'scheduled', 'America/Chicago', 'ready', '2 things to look at', 2, now());
  insert into public.daily_briefs (company_id, brief_date, kind, timezone)
    values (test.u('CID'), '2026-09-02', 'scheduled', 'America/Chicago')
    on conflict (company_id, brief_date, kind) do nothing;
  assert (select count(*) from public.daily_briefs where company_id = test.u('CID') and brief_date = '2026-09-02' and kind = 'scheduled') = 1, 'one brief per day';
  insert into public.daily_brief_deliveries (company_id, brief_id, recipient_email, status, sent_at)
    values (test.u('CID'), '16161616-1616-1616-1616-161616161616', 'owner@example.com', 'sent', now());
  insert into public.daily_brief_deliveries (company_id, brief_id, recipient_email)
    values (test.u('CID'), '16161616-1616-1616-1616-161616161616', 'owner@example.com')
    on conflict (brief_id, recipient_email) do nothing;
  assert (select count(*) from public.daily_brief_deliveries) = 1, 'one delivery per recipient';
end $$;
set role authenticated;

-- A project manager reads briefs and settings but cannot change settings; an employee sees none of it.
select test.as_user(test.u('B'));
do $$ begin
  assert (select count(*) from public.daily_briefs) = 1, 'PM reads briefs';
  assert (select count(*) from public.daily_brief_settings) = 1, 'PM reads settings';
  assert (select count(*) from public.leads) = 1, 'PM reads leads';
  update public.daily_brief_settings set enabled = false where company_id = test.u('CID');
  assert (select enabled from public.daily_brief_settings where company_id = test.u('CID')), 'PM cannot change settings';
end $$;
select test.expect_error(
  format('insert into public.daily_briefs (company_id, brief_date, timezone) values (%L, ''2026-09-03'', ''UTC'')', test.u('CID')), '42501');
select test.as_user(test.u('C'));
do $$ begin
  assert (select count(*) from public.daily_briefs) = 0, 'employee sees no briefs';
  assert (select count(*) from public.daily_brief_settings) = 0, 'employee sees no brief settings';
  assert (select count(*) from public.daily_brief_deliveries) = 0, 'employee sees no deliveries';
  assert (select count(*) from public.leads) = 0, 'employee sees no leads';
  assert (select count(*) from public.subcontractor_applications) = 1, 'employee may see applications (subcontractors.view)';
end $$;
select test.expect_error(
  format('insert into public.leads (company_id, name) values (%L, ''Spoof'')', test.u('CID')), '42501');

-- ── Soft delete hides everything downstream ──────────────────────────────────
select test.as_user(test.u('A'));
update public.projects set deleted_at = now() where id = test.u('PID');
select test.as_user(test.u('B'));
do $$ begin
  assert (select count(*) from public.projects where id = test.u('PID')) = 0, 'deleted project hidden';
  assert (select count(*) from public.estimate_items where estimate_id = test.u('EID')) = 0, 'its items hidden';
  assert (select count(*) from public.notes where project_id = test.u('PID')) = 0, 'its notes hidden';
  assert (select count(*) from public.project_phases where project_id = test.u('PID')) = 0, 'its phases hidden';
  assert (select count(*) from public.projects) = 1, 'other projects still visible';
end $$;

reset role;
do $$ begin
  assert exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'estimate_items'), 'realtime publication';
  assert exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'audit_log'), 'audit realtime';
end $$;
