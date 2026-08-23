import {
  doublePrecision,
  integer,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { user } from './auth'
import { recipesSchema } from './core'

export { recipesSchema } from './core'

export const recipeStepType = recipesSchema.enum('recipe_step_type', [
  'normal',
  'timer',
  'group',
])

export const recipeLabelKind = recipesSchema.enum('recipe_label_kind', [
  'cuisine',
  'source',
  'tag',
])

export const ingredientType = recipesSchema.table('ingredient_type', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdById: text('created_by_id').notNull().references(() => user.id, {
    onDelete: 'cascade',
  }),
  createdAt: timestamp('created_at', {
    withTimezone: true,
  }).notNull().defaultNow(),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const ingredient = recipesSchema.table('ingredient', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdById: text('created_by_id').notNull().references(() => user.id, {
    onDelete: 'cascade',
  }),
  typeId: uuid('type_id').references(() => ingredientType.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', {
    withTimezone: true,
  }).notNull().defaultNow(),
  name: text('name').notNull(),
  calorieAmount: doublePrecision('calorie_amount'),
  calories: integer('calories'),
  caloriesPer100g: integer('calories_per_100g'),
  calorieUnit: text('calorie_unit'),
  defaultUnit: text('default_unit'),
  gramsPerUnit: doublePrecision('grams_per_unit'),
})

export const recipe = recipesSchema.table('recipe', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdById: text('created_by_id').notNull().references(() => user.id, {
    onDelete: 'cascade',
  }),
  imageId: uuid('image_id'),
  createdAt: timestamp('created_at', {
    withTimezone: true,
  }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  }).notNull().defaultNow(),
  name: text('name').notNull(),
  calories: integer('calories'),
  caloriesOverride: integer('calories_override'),
  cookTimeMinutes: integer('cook_time_minutes'),
  cuisine: text('cuisine'),
  defaultPortions: integer('default_portions').notNull().default(2),
  description: text('description'),
  notes: text('notes'),
  prepTimeMinutes: integer('prep_time_minutes'),
  sourceName: text('source_name'),
  sourceUrl: text('source_url'),
  tags: text('tags').array().notNull().default([]),
})

export const recipeLabel = recipesSchema.table('recipe_label', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdById: text('created_by_id').notNull().references(() => user.id, {
    onDelete: 'cascade',
  }),
  createdAt: timestamp('created_at', {
    withTimezone: true,
  }).notNull().defaultNow(),
  name: text('name').notNull(),
  kind: recipeLabelKind('kind').notNull(),
}, (table) => [
  uniqueIndex('recipe_label_created_by_kind_name_unique').on(
    table.createdById,
    table.kind,
    table.name,
  ),
])

export const recipeIngredient = recipesSchema.table('recipe_ingredient', {
  id: uuid('id').defaultRandom().primaryKey(),
  ingredientId: uuid('ingredient_id').notNull().references(() => ingredient.id, {
    onDelete: 'restrict',
  }),
  recipeId: uuid('recipe_id').notNull().references(() => recipe.id, {
    onDelete: 'cascade',
  }),
  isOptional: integer('is_optional').notNull().default(0),
  amount: doublePrecision('amount'),
  note: text('note'),
  sortOrder: integer('sort_order').notNull().default(0),
  unit: text('unit'),
})

export const recipeStep = recipesSchema.table('recipe_step', {
  id: uuid('id').defaultRandom().primaryKey(),
  parentStepId: uuid('parent_step_id'),
  recipeId: uuid('recipe_id').notNull().references(() => recipe.id, {
    onDelete: 'cascade',
  }),
  durationSeconds: integer('duration_seconds'),
  instruction: text('instruction').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  type: recipeStepType('type').notNull().default('normal'),
})

export const recipeCooking = recipesSchema.table('recipe_cooking', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdById: text('created_by_id').notNull().references(() => user.id, {
    onDelete: 'cascade',
  }),
  recipeId: uuid('recipe_id').notNull().references(() => recipe.id, {
    onDelete: 'cascade',
  }),
  createdAt: timestamp('created_at', {
    withTimezone: true,
  }).notNull().defaultNow(),
  note: text('note'),
})

export const recipeImportJob = recipesSchema.table('recipe_import_job', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdById: text('created_by_id').notNull().references(() => user.id, {
    onDelete: 'cascade',
  }),
  imageId: uuid('image_id'),
  recipeId: uuid('recipe_id').references(() => recipe.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', {
    withTimezone: true,
  }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  }).notNull().defaultNow(),
  error: text('error'),
  sourceText: text('source_text'),
  sourceUrl: text('source_url'),
  status: text('status').notNull().default('queued'),
})

export const recipeShare = recipesSchema.table('recipe_share', {
  recipeId: uuid('recipe_id').notNull().references(() => recipe.id, {
    onDelete: 'cascade',
  }),
  sharedWithId: text('shared_with_id').notNull().references(() => user.id, {
    onDelete: 'cascade',
  }),
  createdAt: timestamp('created_at', {
    withTimezone: true,
  }).notNull().defaultNow(),
}, (table) => [
  primaryKey({
    columns: [
      table.recipeId,
      table.sharedWithId,
    ],
  }),
])
