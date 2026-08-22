import { ORPCError } from '@orpc/server'
import {
  and,
  asc,
  eq,
} from 'drizzle-orm'
import * as v from 'valibot'

import { db } from '../../db'
import {
  ingredient,
  ingredientType,
  recipe,
  recipeIngredient,
  recipeStep,
} from '../../db/schema'
import { protectedProcedure } from '../../orpc/procedure'

const defaultIngredientTypes = [
  [
    'Vegetables & fruit',
    'i-lucide-carrot',
  ],
  [
    'Protein',
    'i-lucide-drumstick',
  ],
  [
    'Grains, pasta & bread',
    'i-lucide-wheat',
  ],
  [
    'Dairy & eggs',
    'i-lucide-milk',
  ],
  [
    'Canned & jarred',
    'i-lucide-package',
  ],
  [
    'Herbs & seasonings',
    'i-lucide-sprout',
  ],
  [
    'Sauces, oils & condiments',
    'i-lucide-salad',
  ],
  [
    'Baking',
    'i-lucide-cake-slice',
  ],
  [
    'Frozen',
    'i-lucide-snowflake',
  ],
  [
    'Other',
    'i-lucide-ellipsis',
  ],
] as const

async function ensureDefaultIngredientTypes(userId: string) {
  const existing = await db.query.ingredientType.findFirst({
    where: eq(ingredientType.createdById, userId),
  })

  if (!existing) {
    await db.insert(ingredientType).values(defaultIngredientTypes.map(([
      name,
      icon,
    ], sortOrder) => ({
      createdById: userId,
      name,
      icon,
      sortOrder,
    })))
  }
}

const recipeIngredientSchema = v.object({
  ingredientId: v.pipe(v.string(), v.uuid()),
  isOptional: v.boolean(),
  amount: v.optional(v.nullable(v.pipe(v.number(), v.minValue(0)))),
  note: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(240)))),
  unit: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(30)))),
})
const stepSchema = v.object({
  durationSeconds: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(1)))),
  instruction: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(2000)),
  type: v.picklist([
    'normal',
    'timer',
    'group',
  ]),
})
const createRecipeInput = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(180)),
  caloriesOverride: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(100_000)))),
  cookTimeMinutes: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(1440)))),
  cuisine: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(80)))),
  defaultPortions: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100)),
  description: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(2000)))),
  ingredients: v.array(recipeIngredientSchema),
  notes: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(6000)))),
  prepTimeMinutes: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(1440)))),
  sourceName: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(160)))),
  sourceUrl: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.url(), v.maxLength(2000)))),
  steps: v.array(stepSchema),
  tags: v.array(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(40))),
})

const listRecipeFormData = protectedProcedure.input(v.object({})).handler(async ({
  context,
}) => {
  await ensureDefaultIngredientTypes(context.user.id)

  const [
    types,
    ingredients,
  ] = await Promise.all([
    db.query.ingredientType.findMany({
      orderBy: (table) => asc(table.sortOrder),
      where: eq(ingredientType.createdById, context.user.id),
    }),
    db.query.ingredient.findMany({
      orderBy: (table) => asc(table.name),
      where: eq(ingredient.createdById, context.user.id),
    }),
  ])

  return {
    ingredients,
    types,
  }
})

const createIngredientInput = v.object({
  typeId: v.optional(v.nullable(v.pipe(v.string(), v.uuid()))),
  name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(120)),
  calorieAmount: v.optional(v.nullable(v.pipe(v.number(), v.minValue(0.001), v.maxValue(100_000)))),
  calories: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(100_000)))),
  caloriesPer100g: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(2000)))),
  calorieUnit: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(30)))),
  defaultUnit: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(30)))),
  gramsPerUnit: v.optional(v.nullable(v.pipe(v.number(), v.minValue(0), v.maxValue(100_000)))),
})
const createIngredient = protectedProcedure.input(createIngredientInput).handler(async ({
  context, input,
}) => {
  if (input.typeId) {
    const type = await db.query.ingredientType.findFirst({
      where: and(eq(ingredientType.id, input.typeId), eq(ingredientType.createdById, context.user.id)),
    })

    if (!type) {
      throw new ORPCError('FORBIDDEN')
    }
  }
  const [
    created,
  ] = await db.insert(ingredient).values({
    ...input,
    createdById: context.user.id,
  }).returning()

  if (!created) {
    throw new ORPCError('INTERNAL_SERVER_ERROR')
  }

  return created
})

const updateIngredientInput = v.object({
  id: v.pipe(v.string(), v.uuid()),
  typeId: v.optional(v.nullable(v.pipe(v.string(), v.uuid()))),
  name: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(120))),
  calorieAmount: v.optional(v.nullable(v.pipe(v.number(), v.minValue(0.001), v.maxValue(100_000)))),
  calories: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(100_000)))),
  caloriesPer100g: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(2000)))),
  calorieUnit: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(30)))),
  defaultUnit: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(30)))),
  gramsPerUnit: v.optional(v.nullable(v.pipe(v.number(), v.minValue(0), v.maxValue(100_000)))),
})
const updateIngredient = protectedProcedure.input(updateIngredientInput).handler(async ({
  context, input,
}) => {
  if (input.typeId) {
    const type = await db.query.ingredientType.findFirst({
      where: and(eq(ingredientType.id, input.typeId), eq(ingredientType.createdById, context.user.id)),
    })

    if (!type) {
      throw new ORPCError('FORBIDDEN')
    }
  }
  const [
    updated,
  ] = await db.update(ingredient).set({
    typeId: input.typeId,
    name: input.name,
    calorieAmount: input.calorieAmount,
    calories: input.calories,
    caloriesPer100g: input.caloriesPer100g,
    calorieUnit: input.calorieUnit,
    defaultUnit: input.defaultUnit,
    gramsPerUnit: input.gramsPerUnit,
  }).where(and(eq(ingredient.id, input.id), eq(ingredient.createdById, context.user.id))).returning()

  if (!updated) {
    throw new ORPCError('NOT_FOUND')
  }

  return updated
})

const ingredientTypeInput = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(80)),
  icon: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(100)),
})
const createIngredientType = protectedProcedure.input(ingredientTypeInput).handler(async ({
  context, input,
}) => {
  const existingTypes = await db.query.ingredientType.findMany({
    where: eq(ingredientType.createdById, context.user.id),
  })
  const [
    created,
  ] = await db.insert(ingredientType).values({
    ...input,
    createdById: context.user.id,
    sortOrder: existingTypes.length,
  }).returning()

  if (!created) {
    throw new ORPCError('INTERNAL_SERVER_ERROR')
  }

  return created
})
const updateIngredientType = protectedProcedure.input(v.intersect([
  ingredientTypeInput,
  v.object({
    id: v.pipe(v.string(), v.uuid()),
  }),
])).handler(async ({
  context, input,
}) => {
  const [
    updated,
  ] = await db.update(ingredientType).set({
    name: input.name,
    icon: input.icon,
  }).where(and(eq(ingredientType.id, input.id), eq(ingredientType.createdById, context.user.id))).returning()

  if (!updated) {
    throw new ORPCError('NOT_FOUND')
  }

  return updated
})

const listRecipes = protectedProcedure.input(v.object({})).handler(({
  context,
}) => {
  return db.query.recipe.findMany({
    orderBy: (table) => asc(table.name),
    where: eq(recipe.createdById, context.user.id),
  })
})

const createRecipe = protectedProcedure.input(createRecipeInput).handler(async ({
  context, input,
}) => {
  const ingredientIds = input.ingredients.map((item) => item.ingredientId)
  const owned = ingredientIds.length === 0
    ? []
    : await db.query.ingredient.findMany({
        where: eq(ingredient.createdById, context.user.id),
      })

  if (owned.length < new Set(ingredientIds).size || ingredientIds.some((id) => !owned.some((item) => item.id === id))) {
    throw new ORPCError('FORBIDDEN')
  }
  const ingredientById = new Map(owned.map((item) => [
    item.id,
    item,
  ]))
  const calories = Math.round(input.ingredients.reduce((total, item) => {
    const savedIngredient = ingredientById.get(item.ingredientId)

    if (!savedIngredient?.caloriesPer100g || !item.amount) {
      return total
    }
    let grams = item.amount * (savedIngredient.gramsPerUnit || 0)

    if (item.unit === 'g') {
      grams = item.amount
    }
    else if (item.unit === 'kg') {
      grams = item.amount * 1000
    }

    return total + (grams * savedIngredient.caloriesPer100g / 100)
  }, 0))
  const created = await db.transaction(async (tx) => {
    const [
      newRecipe,
    ] = await tx.insert(recipe).values({
      createdById: context.user.id,
      name: input.name,
      calories: input.caloriesOverride ?? calories,
      caloriesOverride: input.caloriesOverride ?? null,
      cookTimeMinutes: input.cookTimeMinutes ?? null,
      cuisine: input.cuisine || null,
      defaultPortions: input.defaultPortions,
      description: input.description || null,
      notes: input.notes || null,
      prepTimeMinutes: input.prepTimeMinutes ?? null,
      sourceName: input.sourceName || null,
      sourceUrl: input.sourceUrl || null,
      tags: input.tags,
    }).returning()

    if (!newRecipe) {
      throw new ORPCError('INTERNAL_SERVER_ERROR')
    }
    if (input.ingredients.length > 0) {
      await tx.insert(recipeIngredient).values(input.ingredients.map((item, sortOrder) => ({
        ...item,
        recipeId: newRecipe.id,
        isOptional: item.isOptional ? 1 : 0,
        note: item.note || null,
        sortOrder,
        unit: item.unit || null,
      })))
    }
    if (input.steps.length > 0) {
      await tx.insert(recipeStep).values(input.steps.map((item, sortOrder) => ({
        ...item,
        recipeId: newRecipe.id,
        durationSeconds: item.type === 'timer' ? item.durationSeconds : null,
        sortOrder,
      })))
    }

    return newRecipe
  })

  return created
})

export const recipesRouter = {
  createIngredient,
  createIngredientType,
  createRecipe,
  listRecipeFormData,
  listRecipes,
  updateIngredient,
  updateIngredientType,
}
