import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://recipe:recipe@localhost:5432/recipe',
  },
  dialect: 'postgresql',
  out: './drizzle',
  schema: './server/db/schema.ts',
})
