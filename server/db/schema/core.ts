import { pgSchema } from 'drizzle-orm/pg-core'

// This app shares a database with AIMS. All current and future tables belong
// to this schema, preventing naming collisions without a second database.
export const recipesSchema = pgSchema('recipes')
