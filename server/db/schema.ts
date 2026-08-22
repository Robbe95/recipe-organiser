import {
  boolean,
  integer,
  jsonb,
  pgSchema,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

// This app shares a database with AIMS. All current and future tables belong
// to this schema, preventing naming collisions without a second database.
export const recipesSchema = pgSchema('recipes')

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

export const account = recipesSchema.table('account', {
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
  accessToken: text('access_token'),
  idToken: text('id_token'),
  password: text('password'),
  refreshToken: text('refresh_token'),
  scope: text('scope'),
})

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

/** Per-user credentials reserved for the future recipe analysis feature. */
export const userAiSettings = recipesSchema.table('user_ai_settings', {
  userId: text('user_id').primaryKey().references(() => user.id, {
    onDelete: 'cascade',
  }),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  }).notNull().defaultNow(),
  openAiApiKeyEncrypted: text('openai_api_key_encrypted'),
})

export const imageAsset = recipesSchema.table('image_asset', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
  }).notNull().defaultNow(),
  createdById: text('created_by_id').notNull().references(() => user.id, {
    onDelete: 'cascade',
  }),
  crop: jsonb('crop').$type<{
    height: number
    width: number
    x: number
    y: number
  }>().notNull(),
  focalX: real('focal_x').notNull().default(0.5),
  focalY: real('focal_y').notNull().default(0.5),
  height: integer('height').notNull(),
  sourceKey: text('source_key').notNull().unique(),
  variantKeys: jsonb('variant_keys').$type<{
    desktop: string
    full: string
    mobile: string
    tablet: string
    thumbnail: string
  }>().notNull(),
  width: integer('width').notNull(),
})
