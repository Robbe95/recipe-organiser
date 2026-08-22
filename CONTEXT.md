# Recipe Organiser context

## Product direction

- Personal, iPad-first recipe organiser with a calm, playful Nuxt UI.
- The primary cooking experience will be a focused, step-by-step mode with
  timers and notifications.
- Recipes will be imported from images or links through an AI analysis flow.

## Technical decisions

- The app uses Better Auth and Drizzle in the shared Postgres `recipes` schema.
  Never add recipe tables to the default `public` schema.
- Better Auth uses the `@better-auth/drizzle-adapter/relations-v2` adapter.
- Better Auth 1.7 requires `account.issuer` and a unique `(issuer, accountId)`
  index; retain both when editing the authentication schema.
- `pnpm db:seed` is local-only, idempotently creating the development account
  `robbevaes95@gmail.com`; never run it in production.
- Drizzle migration bookkeeping is isolated in
  `recipe_organiser_migrations.__drizzle_migrations`; never use the shared
  default `public.__drizzle_migrations` journal.
- All application API calls use oRPC. Client data hooks belong in
  `app/features/<feature>/api/`; Vue components consume those hooks rather than
  calling Pinia Colada directly.
- Device appearance is managed with Nuxt Color Mode. Kitchen settings exposes
  the same light and dark preference control as AIMS.
- Image work is a dedicated feature: client code lives in `app/features/images`
  and server code in `server/features/images`.
- Keep files focused and normally around 200 lines or fewer. Split by domain
  before a file becomes unwieldy. Feature-owned tables live beside that feature;
  `server/db/schema/` contains only shared schema foundations and composition.
- Images use S3-compatible storage: MinIO locally and Cloudflare R2 on Vercel.
  Buckets stay private. The browser uploads directly with a short-lived
  presigned URL; oRPC authorizes it and finalizes processing.
- On finalization, the server converts images to WebP and stores thumbnail,
  mobile, tablet, desktop, and full variants. Crop and focal-point metadata are
  persisted with the image asset.

## Pending product work

- Define the recipe data model before attaching image assets to recipes.
- Add the AI recipe-analysis contract and upload/link import UI.
- Build the iPad cooking mode after the recipe model is settled.
