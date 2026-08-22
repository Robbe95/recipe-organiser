import { ORPCError } from '@orpc/server'
import {
  and,
  asc,
  eq,
  inArray,
} from 'drizzle-orm'
import * as v from 'valibot'

import { db } from '../../db'
import {
  ingredient,
  ingredientType,
  recipe,
  recipeIngredient,
  recipeLabel,
  recipeStep,
} from '../../db/schema'
import { protectedProcedure } from '../../orpc/procedure'
import { createReadUrl } from '../images/imageStorage'
import { imageAsset } from '../images/schema'

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

function convertAmount(amount: number, fromUnit: string | null | undefined, toUnit: string | null | undefined) {
  if (!fromUnit || !toUnit) {
    return
  }

  if (fromUnit === toUnit) {
    return amount
  }

  const conversions: Record<string, number> = {
    g: 1,
    kg: 1000,
    l: 1000,
    ml: 1,
  }
  const fromFactor = conversions[fromUnit]
  const toFactor = conversions[toUnit]

  if (fromFactor === undefined || toFactor === undefined) {
    return
  }

  return amount * fromFactor / toFactor
}

function calculateRecipeCalories(
  items: Array<{
    ingredientId: string
    amount?: number | null
    unit?: string | null
  }>,
  savedIngredients: Array<{
    id: string
    calorieAmount: number | null
    calories: number | null
    caloriesPer100g: number | null
    calorieUnit: string | null
    gramsPerUnit: number | null
  }>,
) {
  const ingredientById = new Map(savedIngredients.map((item) => [
    item.id,
    item,
  ]))

  return Math.round(items.reduce((total, item) => {
    const savedIngredient = ingredientById.get(item.ingredientId)

    if (!savedIngredient || !item.amount) {
      return total
    }

    if (savedIngredient.calories && savedIngredient.calorieAmount && savedIngredient.calorieUnit) {
      const comparableAmount = convertAmount(item.amount, item.unit, savedIngredient.calorieUnit)

      return comparableAmount === undefined
        ? total
        : total + (comparableAmount * savedIngredient.calories / savedIngredient.calorieAmount)
    }
    if (!savedIngredient.caloriesPer100g) {
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
}

async function assertOwnImage(userId: string, imageId: string | null | undefined) {
  if (!imageId) {
    return
  }

  const image = await db.query.imageAsset.findFirst({
    where: and(eq(imageAsset.id, imageId), eq(imageAsset.createdById, userId)),
  })

  if (!image) {
    throw new ORPCError('FORBIDDEN')
  }
}

interface RecipeLabelsInput {
  cuisine?: string | null
  sourceName?: string | null
  tags: string[]
}

interface RecipeLabelInput {
  name: string
  kind: 'cuisine' | 'source' | 'tag'
}

function toRecipeLabels(input: RecipeLabelsInput) {
  const labels: RecipeLabelInput[] = input.tags.map((name) => ({
    name: name.trim(),
    kind: 'tag' as const,
  })).filter((label) => Boolean(label.name))

  if (input.cuisine?.trim()) {
    labels.push({
      name: input.cuisine.trim(),
      kind: 'cuisine',
    })
  }
  if (input.sourceName?.trim()) {
    labels.push({
      name: input.sourceName.trim(),
      kind: 'source',
    })
  }

  return labels
}

async function saveRecipeLabels(userId: string, input: RecipeLabelsInput) {
  const labels = toRecipeLabels(input)

  if (labels.length === 0) {
    return
  }

  await db.insert(recipeLabel).values(labels.map((label) => ({
    ...label,
    createdById: userId,
  }))).onConflictDoNothing()
}

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
  imageId: v.optional(v.nullable(v.pipe(v.string(), v.uuid()))),
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

  const savedRecipes = await db.query.recipe.findMany({
    columns: {
      cuisine: true,
      sourceName: true,
      tags: true,
    },
    where: eq(recipe.createdById, context.user.id),
  })

  await saveRecipeLabels(context.user.id, {
    cuisine: null,
    sourceName: null,
    tags: savedRecipes.flatMap((savedRecipe) => savedRecipe.tags),
  })
  await Promise.all(savedRecipes.map((savedRecipe) => saveRecipeLabels(context.user.id, {
    cuisine: savedRecipe.cuisine,
    sourceName: savedRecipe.sourceName,
    tags: [],
  })))

  const [
    types,
    ingredients,
    labels,
  ] = await Promise.all([
    db.query.ingredientType.findMany({
      orderBy: (table) => asc(table.sortOrder),
      where: eq(ingredientType.createdById, context.user.id),
    }),
    db.query.ingredient.findMany({
      orderBy: (table) => asc(table.name),
      where: eq(ingredient.createdById, context.user.id),
    }),
    db.query.recipeLabel.findMany({
      orderBy: (table) => asc(table.name),
      where: eq(recipeLabel.createdById, context.user.id),
    }),
  ])

  return {
    ingredients,
    labels,
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
const createRecipeLabelInput = v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(160)),
  kind: v.picklist([
    'cuisine',
    'source',
    'tag',
  ]),
})
const createRecipeLabel = protectedProcedure.input(createRecipeLabelInput).handler(async ({
  context, input,
}) => {
  const [
    created,
  ] = await db.insert(recipeLabel).values({
    ...input,
    createdById: context.user.id,
  }).onConflictDoNothing().returning()

  if (created) {
    return created
  }

  const existing = await db.query.recipeLabel.findFirst({
    where: and(
      eq(recipeLabel.createdById, context.user.id),
      eq(recipeLabel.kind, input.kind),
      eq(recipeLabel.name, input.name),
    ),
  })

  if (!existing) {
    throw new ORPCError('INTERNAL_SERVER_ERROR')
  }

  return existing
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

const listRecipes = protectedProcedure.input(v.object({})).handler(async ({
  context,
}) => {
  const recipes = await db.query.recipe.findMany({
    orderBy: (table) => asc(table.name),
    where: eq(recipe.createdById, context.user.id),
  })
  const imageIds = recipes.flatMap((savedRecipe) => savedRecipe.imageId
    ? [
        savedRecipe.imageId,
      ]
    : [])
  const images = imageIds.length === 0
    ? []
    : await db.query.imageAsset.findMany({
        where: inArray(imageAsset.id, imageIds),
      })
  const imageById = new Map(images.map((image) => [
    image.id,
    image,
  ]))

  return Promise.all(recipes.map(async (savedRecipe) => {
    const image = savedRecipe.imageId ? imageById.get(savedRecipe.imageId) : undefined

    return {
      ...savedRecipe,
      image: image
        ? {
            id: image.id,
            url: await createReadUrl(image.variantKeys.thumbnail),
          }
        : null,
    }
  }))
})

const getRecipe = protectedProcedure.input(v.object({
  id: v.pipe(v.string(), v.uuid()),
})).handler(async ({
  context, input,
}) => {
  const savedRecipe = await db.query.recipe.findFirst({
    where: and(eq(recipe.id, input.id), eq(recipe.createdById, context.user.id)),
  })

  if (!savedRecipe) {
    throw new ORPCError('NOT_FOUND')
  }

  const [
    ingredients,
    steps,
  ] = await Promise.all([
    db.query.recipeIngredient.findMany({
      orderBy: (table) => asc(table.sortOrder),
      where: eq(recipeIngredient.recipeId, savedRecipe.id),
    }),
    db.query.recipeStep.findMany({
      orderBy: (table) => asc(table.sortOrder),
      where: eq(recipeStep.recipeId, savedRecipe.id),
    }),
  ])

  return {
    ...savedRecipe,
    ingredients,
    steps,
  }
})

const createRecipe = protectedProcedure.input(createRecipeInput).handler(async ({
  context, input,
}) => {
  await assertOwnImage(context.user.id, input.imageId)

  const ingredientIds = input.ingredients.map((item) => item.ingredientId)
  const owned = ingredientIds.length === 0
    ? []
    : await db.query.ingredient.findMany({
        where: eq(ingredient.createdById, context.user.id),
      })

  if (owned.length < new Set(ingredientIds).size || ingredientIds.some((id) => !owned.some((item) => item.id === id))) {
    throw new ORPCError('FORBIDDEN')
  }
  const calories = calculateRecipeCalories(input.ingredients, owned)
  const created = await db.transaction(async (tx) => {
    const [
      newRecipe,
    ] = await tx.insert(recipe).values({
      createdById: context.user.id,
      imageId: input.imageId ?? null,
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

    const labels = toRecipeLabels(input)

    if (labels.length > 0) {
      await tx.insert(recipeLabel).values(labels.map((label) => ({
        ...label,
        createdById: context.user.id,
      }))).onConflictDoNothing()
    }

    return newRecipe
  })

  return created
})

const updateRecipeInput = v.intersect([
  v.object({
    id: v.pipe(v.string(), v.uuid()),
  }),
  createRecipeInput,
])
const updateRecipe = protectedProcedure.input(updateRecipeInput).handler(async ({
  context, input,
}) => {
  await assertOwnImage(context.user.id, input.imageId)

  const existing = await db.query.recipe.findFirst({
    where: and(eq(recipe.id, input.id), eq(recipe.createdById, context.user.id)),
  })

  if (!existing) {
    throw new ORPCError('NOT_FOUND')
  }

  const ingredientIds = input.ingredients.map((item) => item.ingredientId)
  const ownedIngredients = ingredientIds.length === 0
    ? []
    : await db.query.ingredient.findMany({
        where: eq(ingredient.createdById, context.user.id),
      })

  const hasUnownedIngredient = ownedIngredients.length < new Set(ingredientIds).size
    || ingredientIds.some((id) => !ownedIngredients.some((item) => item.id === id))

  if (hasUnownedIngredient) {
    throw new ORPCError('FORBIDDEN')
  }

  const calories = calculateRecipeCalories(input.ingredients, ownedIngredients)

  const updated = await db.transaction(async (tx) => {
    const [
      savedRecipe,
    ] = await tx.update(recipe).set({
      imageId: input.imageId ?? null,
      updatedAt: new Date(),
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
    }).where(eq(recipe.id, existing.id)).returning()

    if (!savedRecipe) {
      throw new ORPCError('INTERNAL_SERVER_ERROR')
    }

    await Promise.all([
      tx.delete(recipeIngredient).where(eq(recipeIngredient.recipeId, existing.id)),
      tx.delete(recipeStep).where(eq(recipeStep.recipeId, existing.id)),
    ])

    if (input.ingredients.length > 0) {
      await tx.insert(recipeIngredient).values(input.ingredients.map((item, sortOrder) => ({
        ...item,
        recipeId: existing.id,
        isOptional: item.isOptional ? 1 : 0,
        note: item.note || null,
        sortOrder,
        unit: item.unit || null,
      })))
    }
    if (input.steps.length > 0) {
      await tx.insert(recipeStep).values(input.steps.map((item, sortOrder) => ({
        ...item,
        recipeId: existing.id,
        durationSeconds: item.type === 'timer' ? item.durationSeconds : null,
        sortOrder,
      })))
    }

    const labels = toRecipeLabels(input)

    if (labels.length > 0) {
      await tx.insert(recipeLabel).values(labels.map((label) => ({
        ...label,
        createdById: context.user.id,
      }))).onConflictDoNothing()
    }

    return savedRecipe
  })

  return updated
})

export const recipesRouter = {
  createIngredient,
  createIngredientType,
  createRecipe,
  createRecipeLabel,
  getRecipe,
  listRecipeFormData,
  listRecipes,
  updateIngredient,
  updateIngredientType,
  updateRecipe,
}
