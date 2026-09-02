-- ============================================================================
-- Monarch Admin · migration 0005 · Supabase Storage buckets and policies
-- Buckets are private. Objects live at  {company_id}/{project_id}/{file_id}.ext
-- so the path alone tells the policy which project scope applies.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('plans',  'plans',  false, 52428800, null),
  ('photos', 'photos', false, 26214400,
   array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif'])
on conflict (id) do nothing;

-- Safe uuid extraction from a path segment (null when not a uuid).
create or replace function authz.path_uuid(p text, idx int) returns uuid
language sql stable as $$
  select case
    when (storage.foldername(p))[idx] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then (storage.foldername(p))[idx]::uuid
  end
$$;
grant execute on function authz.path_uuid(text, int) to authenticated, service_role;

drop policy if exists "monarch files select" on storage.objects;
drop policy if exists "monarch files insert" on storage.objects;
drop policy if exists "monarch files update" on storage.objects;
drop policy if exists "monarch files delete" on storage.objects;

create policy "monarch files select" on storage.objects for select to authenticated
  using (bucket_id in ('plans', 'photos')
         and authz.has_cap(authz.path_uuid(name, 1), 'files.view')
         and authz.on_project(authz.path_uuid(name, 2)));

create policy "monarch files insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('plans', 'photos')
              and authz.has_cap(authz.path_uuid(name, 1), 'files.upload')
              and authz.on_project(authz.path_uuid(name, 2)));

create policy "monarch files update" on storage.objects for update to authenticated
  using (bucket_id in ('plans', 'photos')
         and authz.on_project(authz.path_uuid(name, 2))
         and (authz.has_cap(authz.path_uuid(name, 1), 'files.delete')
              or coalesce(owner_id, owner::text) = auth.uid()::text))
  with check (bucket_id in ('plans', 'photos')
              and authz.has_cap(authz.path_uuid(name, 1), 'files.upload')
              and authz.on_project(authz.path_uuid(name, 2)));

create policy "monarch files delete" on storage.objects for delete to authenticated
  using (bucket_id in ('plans', 'photos')
         and authz.on_project(authz.path_uuid(name, 2))
         and (authz.has_cap(authz.path_uuid(name, 1), 'files.delete')
              or coalesce(owner_id, owner::text) = auth.uid()::text));
