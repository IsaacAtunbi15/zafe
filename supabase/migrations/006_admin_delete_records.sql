-- Allow administrators to permanently delete catalogue records.
-- Related media and revisions are removed by their ON DELETE CASCADE constraints.
drop policy if exists admin_delete_records on public.records;
create policy admin_delete_records on public.records for delete
using (public.has_role(array['ADMIN'::public.user_role]));
