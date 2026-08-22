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

The migration journal is isolated at
`recipe_organiser_migrations.__drizzle_migrations`, separate from the
application's `recipes` schema.
If the first two Recipe Organiser migrations were already applied while they
were recorded in `public.__drizzle_migrations`, follow the one-time handover in
[`docs/database/migration-journal-handover.md`](docs/database/migration-journal-handover.md)
before running the next migration.

## Local setup

```bash
cp .env.example .env
# Set BETTER_AUTH_SECRET in .env to: openssl rand -base64 32
docker compose up -d
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

`docker compose up -d` also starts a local MinIO server for recipe images.
The S3 API is at `http://127.0.0.1:9000` and its console is at
`http://127.0.0.1:9001`; the `s3-init` service creates the `recipe-images`
bucket. The bucket remains private so the app can use time-limited signed URLs
when recipe photos are added.

Image uploads use oRPC to authorize the upload and finalize it. The actual file
goes directly to storage with a five-minute signed URL, then the server uses
Sharp to create private WebP variants: thumbnail (240px), mobile (800px),
tablet (1200px), desktop (1600px), and full (up to 2400px). Crop and focal
point metadata are kept in `recipes.image_asset`.

For Cloudflare R2, set `S3_ENDPOINT` to your R2 S3 endpoint,
`S3_REGION=auto`, and `S3_FORCE_PATH_STYLE=false`. Configure the bucket CORS
policy to allow `GET`, `HEAD`, and `PUT` from the Vercel app’s exact origin,
with `content-type` as an allowed header.

Public sign-up is disabled. Until an invitation or admin flow exists, enable a
local account only through a deliberate temporary workflow. `pnpm db:seed`
creates `robbevaes95@gmail.com` with the local-only password `test12345`; it is
idempotent and refuses to run with `NODE_ENV=production`.

Useful commands:

```bash
pnpm db:generate # Generate a migration after changing server/db/schema.ts
pnpm db:migrate  # Apply generated migrations
pnpm db:seed     # Create the local development login
pnpm typecheck
pnpm lint
```

## Kept ready for recipe analysis

The app retains the OpenAI SDK, encrypted credential helper, and
`recipes.user_ai_settings` table. No AI API route has been added yet: that lets
the next phase define the recipe format and the upload/link experience before
we commit to an analysis contract.
