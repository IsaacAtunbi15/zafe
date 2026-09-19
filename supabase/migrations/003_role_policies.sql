-- Role-aware review and publishing policies.
create or replace function public.has_role(required_roles public.user_role[])
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role = any(required_roles));
$$;

create policy researchers_edit_records on public.records for update
using (public.has_role(array['RESEARCHER'::public.user_role,'CURATOR'::public.user_role,'ADMIN'::public.user_role)))
with check (public.has_role(array['RESEARCHER'::public.user_role,'CURATOR'::public.user_role,'ADMIN'::public.user_role)));

create policy curators_publish_records on public.records for update
using (public.has_role(array['CURATOR'::public.user_role,'ADMIN'::public.user_role]))
with check (public.has_role(array['CURATOR'::public.user_role,'ADMIN'::public.user_role]));

create policy curators_manage_revisions on public.revisions for all
using (public.has_role(array['CURATOR'::public.user_role,'ADMIN'::public.user_role]))
with check (public.has_role(array['CURATOR'::public.user_role,'ADMIN'::public.user_role]));
