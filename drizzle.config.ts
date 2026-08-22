import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://recipe:recipe@localhost:5432/recipe',
  },
  dialect: 'postgresql',
  migrations: {
    // Kept separate from the application schema because Drizzle creates its
    // journal schema before it executes the migration that creates `recipes`.
    schema: 'recipe_organiser_migrations',
    table: '__drizzle_migrations',
  },
  out: './drizzle',
  schema: './server/db/schema/index.ts',
})
