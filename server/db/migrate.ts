import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run migrations.')
}

const pool = new Pool({
  connectionString,
})

try {
  await migrate(drizzle({ client: pool }), {
    migrationsFolder: 'drizzle',
    migrationsSchema: 'recipe_organiser_migrations',
    migrationsTable: '__drizzle_migrations',
  })
}
finally {
  await pool.end()
}
