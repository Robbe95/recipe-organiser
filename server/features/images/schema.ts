import {
  integer,
  jsonb,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

import { user } from '../../db/schema/auth'
import { recipesSchema } from '../../db/schema/recipes'

export const imageAsset = recipesSchema.table('image_asset', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdById: text('created_by_id').notNull().references(() => user.id, {
    onDelete: 'cascade',
  }),
  createdAt: timestamp('created_at', {
    withTimezone: true,
  }).notNull().defaultNow(),
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
