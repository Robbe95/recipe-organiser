import { Pool as NeonPool } from '@neondatabase/serverless'
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless'
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import * as schema from './schema'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is required to connect to the database.')
}

// Vercel runs with NODE_ENV=production, so production uses Neon HTTP. Local
// development stays on node-postgres and Docker unless explicitly overridden.
const useNeon
  = process.env.DATABASE_DRIVER === 'neon'
    || (process.env.NODE_ENV === 'production'
      && process.env.DATABASE_DRIVER !== 'pg')

export const db = useNeon
  ? drizzleNeon(
      new NeonPool({
        connectionString,
        max: 1,
      }),
      {
        schema,
      },
    )
  : drizzlePg({
      client: new Pool({
        connectionString,
        max: 1,
      }),
      schema,
    })
