-- ZAFE initial Supabase schema
create type public.user_role as enum ('VISITOR','CONTRIBUTOR','RESEARCHER','CURATOR','ADMIN');
create type public.record_status as enum ('DRAFT','IN_REVIEW','CHANGES_REQUESTED','APPROVED','PUBLISHED','ARCHIVED');
create type public.record_type as enum ('PHOTOGRAPH','PHOTO_SERIES','FILM','DOCUMENTARY','INTERVIEW','ORAL_HISTORY','AUDIO','ARTICLE','ESSAY','RESEARCH_NOTE','OBJECT','CRAFT','FASHION_WORK','ARCHIVAL_DOCUMENT');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  role public.user_role not null default 'VISITOR',
  created_at timestamptz not null default now()
);
create table public.editions (
  id uuid primary key default gen_random_uuid(), year integer not null unique,
  title text not null, theme text not null, slug text not null unique,
  venue text, city text, country text not null default 'Nigeria', description text,
  event_date timestamptz, created_at timestamptz not null default now()
);
create table public.collections (id uuid primary key default gen_random_uuid(), title text not null, slug text not null unique, description text, year integer, created_at timestamptz not null default now());
create table public.people (id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, role text not null, bio text, location text, created_at timestamptz not null default now());
create table public.places (id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, description text, location_text text, latitude numeric, longitude numeric, created_at timestamptz not null default now());
create table public.practices (id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, description text, created_at timestamptz not null default now());
create table public.records (
  id uuid primary key default gen_random_uuid(), archive_id text not null unique, title text not null,
  slug text not null unique, type public.record_type not null, status public.record_status not null default 'DRAFT',
  summary text, description text, language text, rights_statement text, credit_line text,
  featured boolean not null default false, published_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id), edition_id uuid references public.editions(id), collection_id uuid references public.collections(id), person_id uuid references public.people(id), place_id uuid references public.places(id), practice_id uuid references public.practices(id)
);
create table public.media (id uuid primary key default gen_random_uuid(), record_id uuid not null references public.records(id) on delete cascade, kind text not null, url text, drive_file_id text, alt_text text, caption text, sort_order integer not null default 0, created_at timestamptz not null default now());
create table public.programme_items (id uuid primary key default gen_random_uuid(), edition_id uuid not null references public.editions(id) on delete cascade, start_time text not null, end_time text, title text not null, type text, description text, location text, display_order integer not null default 0);
create table public.revisions (id uuid primary key default gen_random_uuid(), record_id uuid not null references public.records(id) on delete cascade, status public.record_status not null, note text, created_by uuid references public.profiles(id), created_at timestamptz not null default now());

create index records_status_idx on public.records(status); create index records_type_idx on public.records(type); create index records_search_idx on public.records using gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(description,'')));
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create trigger records_touch_updated_at before update on public.records for each row execute function public.touch_updated_at();
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(id,name,role) values(new.id,coalesce(new.raw_user_meta_data->>'name',''),'VISITOR'::public.user_role); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security; alter table public.editions enable row level security; alter table public.collections enable row level security; alter table public.people enable row level security; alter table public.places enable row level security; alter table public.practices enable row level security; alter table public.records enable row level security; alter table public.media enable row level security; alter table public.programme_items enable row level security; alter table public.revisions enable row level security;
create policy public_read_editions on public.editions for select using (true); create policy public_read_collections on public.collections for select using (true); create policy public_read_people on public.people for select using (true); create policy public_read_places on public.places for select using (true); create policy public_read_practices on public.practices for select using (true); create policy public_read_programme on public.programme_items for select using (true); create policy public_read_media on public.media for select using (exists(select 1 from public.records r where r.id=record_id and r.status='PUBLISHED'));
create policy public_read_published_records on public.records for select using (status='PUBLISHED' or created_by=auth.uid());
create policy contributors_create_records on public.records for insert with check (created_by=auth.uid()); create policy owners_update_drafts on public.records for update using (created_by=auth.uid() and status in ('DRAFT','CHANGES_REQUESTED')) with check (created_by=auth.uid());
create policy profile_self_read on public.profiles for select using (id=auth.uid());

insert into public.editions(year,title,theme,slug,venue,city) values (2026,'Threads of Ancestry','Threads of Ancestry','2026','Ahmadu Bello University','Zaria') on conflict (year) do nothing;
insert into public.collections(title,slug,year) values ('Threads of Ancestry','threads-of-ancestry',2026) on conflict (slug) do nothing;
insert into public.practices(name,slug) values ('Traditional embroidery','traditional-embroidery') on conflict (slug) do nothing;
