import { drizzleAdapter } from '@better-auth/drizzle-adapter/relations-v2'
import { betterAuth } from 'better-auth'

import { db } from '../db'
import * as schema from '../db/schema'

const secret = process.env.BETTER_AUTH_SECRET

if (!secret || secret.length < 32) {
  throw new Error(
    'BETTER_AUTH_SECRET must be set to a random value of at least 32 characters.',
  )
}

export const auth = betterAuth({
  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
    useSecureCookies: process.env.NODE_ENV === 'production',
  },
  baseURL: {
    allowedHosts: [
      '*.robbevaes.com',
      'localhost:3000',
    ],

  },
  database: drizzleAdapter(db, {
    camelCase: true,
    provider: 'pg',
    schema,
  }),
  emailAndPassword: {
    // Accounts are created by an admin workflow. The seed script temporarily opts in locally.
    disableSignUp: process.env.ALLOW_LOCAL_SIGNUP !== 'true',
    enabled: true,
    // The short seeded password is strictly for local development. Production requires 12+ characters.
    minPasswordLength: process.env.NODE_ENV === 'production' ? 12 : 6,
  },
  secret,
  session: {
    expiresIn: 60 * 60 * 8,
    updateAge: 60 * 60,
  },
})
