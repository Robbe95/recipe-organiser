# Recipe Organiser

A playful, iPad-friendly recipe workspace built with Nuxt UI, Better Auth,
Drizzle, and Postgres. It currently contains the authenticated application
shell and an empty recipe browser, ready for the recipe model and cooking flow.

## Database isolation

This project is designed to share a Postgres database with AIMS without sharing
tables. Drizzle places every table in the `recipes` PostgreSQL schema:

- `recipes.user`, `recipes.session`, `recipes.account`, and
  `recipes.verification` for Better Auth
- `recipes.user_ai_settings` for encrypted, per-user OpenAI credentials
- future recipe tables will live in `recipes` too

The first generated migration creates the schema. Apply it once against the
shared database with `pnpm db:migrate`; the database role needs permission to
run `CREATE SCHEMA`.

## Local setup

```bash
cp .env.example .env
# Set BETTER_AUTH_SECRET in .env to: openssl rand -base64 32
docker compose up -d
pnpm install
pnpm db:migrate
pnpm dev
```

`docker compose up -d` also starts a local MinIO server for recipe images.
The S3 API is at `http://127.0.0.1:9000` and its console is at
`http://127.0.0.1:9001`; the `s3-init` service creates the `recipe-images`
bucket. The bucket remains private so the app can use time-limited signed URLs
when recipe photos are added.

Public sign-up is disabled. Until an invitation or admin flow exists, enable a
local account only through a deliberate temporary workflow.

Useful commands:

```bash
pnpm db:generate # Generate a migration after changing server/db/schema.ts
pnpm db:migrate  # Apply generated migrations
pnpm typecheck
pnpm lint
```

## Kept ready for recipe analysis

The app retains the OpenAI SDK, encrypted credential helper, and
`recipes.user_ai_settings` table. No AI API route has been added yet: that lets
the next phase define the recipe format and the upload/link experience before
we commit to an analysis contract.
