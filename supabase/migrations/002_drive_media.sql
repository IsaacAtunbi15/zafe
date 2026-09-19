-- Run this only if 001_initial.sql was already applied.
alter table public.media add column if not exists drive_file_id text;
create index if not exists media_drive_file_idx on public.media(drive_file_id);
