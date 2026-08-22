import {
  boolean,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

import { recipesSchema } from './core'

export const user = recipesSchema.table('user', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
  }).notNull(),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  }).notNull(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
})

export const session = recipesSchema.table('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, {
    onDelete: 'cascade',
  }),
  createdAt: timestamp('created_at', {
    withTimezone: true,
  }).notNull(),
  expiresAt: timestamp('expires_at', {
    withTimezone: true,
  }).notNull(),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  }).notNull(),
  ipAddress: text('ip_address'),
  token: text('token').notNull().unique(),
  userAgent: text('user_agent'),
})

export const account = recipesSchema.table(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id').notNull().references(() => user.id, {
      onDelete: 'cascade',
    }),
    accessTokenExpiresAt: timestamp('access_token_expires_at', {
      withTimezone: true,
    }),
    createdAt: timestamp('created_at', {
      withTimezone: true,
    }).notNull(),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
      withTimezone: true,
    }),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
    }).notNull(),
    issuer: text('issuer').notNull(),
    accessToken: text('access_token'),
    idToken: text('id_token'),
    password: text('password'),
    refreshToken: text('refresh_token'),
    scope: text('scope'),
  },
  (table) => [
    uniqueIndex('account_issuer_account_id_unique').on(
      table.issuer,
      table.accountId,
    ),
  ],
)

export const verification = recipesSchema.table('verification', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
  }),
  expiresAt: timestamp('expires_at', {
    withTimezone: true,
  }).notNull(),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  }),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
})
