import {
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

import { user } from '../../db/schema/auth'
import { recipesSchema } from '../../db/schema/core'

export const householdRole = recipesSchema.enum('household_role', [
  'owner',
  'member',
])

export const household = recipesSchema.table('household', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdById: text('created_by_id').notNull().references(() => user.id, {
    onDelete: 'cascade',
  }),
  createdAt: timestamp('created_at', {
    withTimezone: true,
  }).notNull().defaultNow(),
  name: text('name').notNull(),
})

export const householdMember = recipesSchema.table('household_member', {
  householdId: uuid('household_id').notNull().references(() => household.id, {
    onDelete: 'cascade',
  }),
  userId: text('user_id').notNull().references(() => user.id, {
    onDelete: 'cascade',
  }),
  joinedAt: timestamp('joined_at', {
    withTimezone: true,
  }).notNull().defaultNow(),
  role: householdRole('role').notNull().default('member'),
}, (table) => [
  primaryKey({
    columns: [
      table.householdId,
      table.userId,
    ],
  }),
])
