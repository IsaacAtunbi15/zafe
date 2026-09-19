# ZAFE backend foundation

Run `npm run api` to start the local API on port 8787. It exposes starter CRUD resources at `/api/editions`, `/api/records`, `/api/people`, `/api/collections`, `/api/places`, and `/api/practices`, plus `/health`.

The Prisma schema is the production data model: users/roles, editions, collections, people, places, practices, records, media, programme items, revisions, and draft → review → approved → published → archived workflow.

For PostgreSQL: copy `.env.example` to `.env`, set `DATABASE_URL`, then run `npm run prisma:generate` and `npm run prisma:push`. Prisma 7 reads the connection through `prisma.config.ts`.
