-- Every account created through the public signup flow is an administrator.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  insert into public.profiles(id,name,role)
  values(new.id,coalesce(new.raw_user_meta_data->>'name',''),'ADMIN'::public.user_role)
  on conflict (id) do nothing;
  return new;
end
$$;

-- Existing profiles can be promoted explicitly by an administrator.
