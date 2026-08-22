# Recipe Organiser context

## Product direction

- Personal, iPad-first recipe organiser with a calm, playful Nuxt UI.
- The primary cooking experience will be a focused, step-by-step mode with
  timers and notifications.
- Recipes will be imported from images or links through an AI analysis flow.

## Technical decisions

- The app uses Better Auth and Drizzle in the shared Postgres `recipes` schema.
  Never add recipe tables to the default `public` schema.
- All application API calls use oRPC. Client data hooks belong in
  `app/features/<feature>/api/`; Vue components consume those hooks rather than
  calling Pinia Colada directly.
- Image work is a dedicated feature: client code lives in `app/features/images`
  and server code in `server/features/images`.
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
