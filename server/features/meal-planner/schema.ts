import {
  doublePrecision,
  integer,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

import { user } from '../../db/schema/auth'
import { recipesSchema } from '../../db/schema/core'
import {
  ingredient,
  recipe,
} from '../../db/schema/recipes'
import { household } from '../households/schema'

export const mealPlanItem = recipesSchema.table('meal_plan_item', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdById: text('created_by_id').notNull().references(() => user.id, {
    onDelete: 'cascade',
  }),
  householdId: uuid('household_id').notNull().references(() => household.id, {
    onDelete: 'cascade',
  }),
  recipeId: uuid('recipe_id').notNull().references(() => recipe.id, {
    onDelete: 'cascade',
  }),
  createdAt: timestamp('created_at', {
    withTimezone: true,
  }).notNull().defaultNow(),
  note: text('note'),
  portions: integer('portions').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const shoppingListItem = recipesSchema.table('shopping_list_item', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdById: text('created_by_id').notNull().references(() => user.id, {
    onDelete: 'cascade',
  }),
  householdId: uuid('household_id').notNull().references(() => household.id, {
    onDelete: 'cascade',
  }),
  ingredientId: uuid('ingredient_id').references(() => ingredient.id, {
    onDelete: 'set null',
  }),
  completedAt: timestamp('completed_at', {
    withTimezone: true,
  }),
  createdAt: timestamp('created_at', {
    withTimezone: true,
  }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  }).notNull().defaultNow(),
  name: text('name').notNull(),
  amount: doublePrecision('amount'),
  groupName: text('group_name'),
  note: text('note'),
  sortOrder: integer('sort_order').notNull().default(0),
  unit: text('unit'),
})

export const shoppingListItemSource = recipesSchema.table('shopping_list_item_source', {
  mealPlanItemId: uuid('meal_plan_item_id').notNull().references(() => mealPlanItem.id, {
    onDelete: 'cascade',
  }),
  shoppingListItemId: uuid('shopping_list_item_id').notNull().references(() => shoppingListItem.id, {
    onDelete: 'cascade',
  }),
}, (table) => [
  primaryKey({
    columns: [
      table.shoppingListItemId,
      table.mealPlanItemId,
    ],
  }),
])
