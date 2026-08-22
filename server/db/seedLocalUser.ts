/* eslint-disable no-console */
import {
  and,
  eq,
} from 'drizzle-orm'

import { auth } from '../utils/auth'
import { db } from './index'
import {
  account,
  user,
} from './schema'

const localUser = {
  name: 'Robbe Vaes',
  email: 'robbevaes95@gmail.com',
  password: 'test12345',
} as const

async function seedLocalUser() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed a production database.')
  }

  const existingUser = await db.query.user.findFirst({
    where: eq(user.email, localUser.email),
  })

  const credentialAccount = existingUser
    ? await db.query.account.findFirst({
        where: and(
          eq(account.providerId, 'credential'),
          eq(account.userId, existingUser.id),
        ),
      })
    : undefined

  if (credentialAccount?.password) {
    console.log(`Local user ${localUser.email} already exists.`)

    return
  }

  if (existingUser) {
    // The local seed may have been interrupted after user creation. Remove only
    // that incomplete local account and recreate it through Better Auth.
    await db.delete(user).where(eq(user.id, existingUser.id))
  }

  await auth.api.signUpEmail({
    body: localUser,
  })

  console.log(`Created local user ${localUser.email}.`)
}

void seedLocalUser().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
