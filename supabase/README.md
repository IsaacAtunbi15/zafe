# Supabase setup

1. Create a Supabase project.
2. In Project Settings → API, copy the Project URL and anon key into `.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. In SQL Editor, paste and run `supabase/migrations/001_initial.sql`.
4. Create a Storage bucket named `zafe-media`. Keep originals private and expose only approved derivatives.
5. Enable Email Auth under Authentication → Providers.
6. Add a `profiles` table keyed to `auth.users.id` with a `role` column (`VISITOR`, `CONTRIBUTOR`, `RESEARCHER`, `CURATOR`, `ADMIN`).
7. Add Row Level Security policies before production: public users can select only `PUBLISHED` records; contributors can manage their own drafts; curators/admins can review and publish.

For Google Drive videos, store the file ID in `media.drive_file_id`. Use `src/components/DriveVideo.jsx` to render the `/preview` player. If the initial migration was already run, apply `supabase/migrations/002_drive_media.sql`.

After the initial schema, apply `003_role_policies.sql` to enable researcher, curator, and administrator review/publishing permissions.

The frontend client is in `src/lib/supabase.js`; it safely stays `null` until the environment variables exist.
