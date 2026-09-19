-- Documentation Desk permissions: administrators only.
drop policy if exists contributors_create_records on public.records;
drop policy if exists admin_create_records on public.records;
create policy admin_create_records on public.records for insert
with check (
  created_by=auth.uid() and public.has_role(array['ADMIN'::public.user_role])
);

drop policy if exists owners_update_drafts on public.records;
drop policy if exists researchers_edit_records on public.records;
drop policy if exists curators_publish_records on public.records;
drop policy if exists admin_update_records on public.records;
create policy admin_update_records on public.records for update
using (public.has_role(array['ADMIN'::public.user_role]))
with check (public.has_role(array['ADMIN'::public.user_role]));

drop policy if exists staff_read_all_records on public.records;
create policy staff_read_all_records on public.records for select
using (public.has_role(array['ADMIN'::public.user_role]));

drop policy if exists staff_read_media on public.media;
create policy staff_read_media on public.media for select
using (public.has_role(array['ADMIN'::public.user_role]));

drop policy if exists staff_create_media on public.media;
create policy staff_create_media on public.media for insert
with check (public.has_role(array['ADMIN'::public.user_role]));

drop policy if exists staff_update_media on public.media;
create policy staff_update_media on public.media for update
using (public.has_role(array['ADMIN'::public.user_role]))
with check (public.has_role(array['ADMIN'::public.user_role]));

drop policy if exists staff_delete_media on public.media;
create policy staff_delete_media on public.media for delete
using (public.has_role(array['ADMIN'::public.user_role]));

drop policy if exists curators_manage_revisions on public.revisions;
drop policy if exists admin_manage_revisions on public.revisions;
create policy admin_manage_revisions on public.revisions for all
using (public.has_role(array['ADMIN'::public.user_role]))
with check (public.has_role(array['ADMIN'::public.user_role]));

-- Storage objects use a top-level record UUID folder.
drop policy if exists staff_upload_archive_media on storage.objects;
create policy staff_upload_archive_media on storage.objects for insert to authenticated
with check (bucket_id='zafe-media' and public.has_role(array['ADMIN'::public.user_role]));

drop policy if exists staff_read_archive_media on storage.objects;
create policy staff_read_archive_media on storage.objects for select to authenticated
using (bucket_id='zafe-media' and public.has_role(array['ADMIN'::public.user_role]));

drop policy if exists curators_manage_archive_media on storage.objects;
create policy curators_manage_archive_media on storage.objects for all to authenticated
using (bucket_id='zafe-media' and public.has_role(array['ADMIN'::public.user_role]))
with check (bucket_id='zafe-media' and public.has_role(array['ADMIN'::public.user_role]));
