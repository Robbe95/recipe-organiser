import { ORPCError } from '@orpc/server'
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
} from 'drizzle-orm'
import * as v from 'valibot'

import { db } from '../../db'
import {
  ingredient,
  ingredientType,
  ingredientVariant,
  recipe,
  recipeCooking,
  recipeImportJob,
  recipeIngredient,
  recipeLabel,
  recipeStep,
} from '../../db/schema'
import {
  protectedProcedure,
  publicProcedure,
} from '../../orpc/procedure'
import {
  createReadUrl,
  readObject,
} from '../images/imageStorage'
import { imageAsset } from '../images/schema'
import type { ImportedRecipe } from './recipeImport.service'
import {
  extractRecipeFromImage,
  extractRecipeFromText,
  parseImportedRecipe,
} from './recipeImport.service'
import { fetchRecipePageText } from './recipeUrlImport.service'

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

function normalizeImportedNutrition(item: ImportedRecipe['ingredients'][number]) {
  const unit = item.nutritionUnit || item.defaultUnit || item.unit || null
  let normalization: {
    calorieAmount: number
    calorieUnit: string | null
  } = {
    calorieAmount: 1,
    calorieUnit: unit,
  }

  if (unit === 'g' || unit === 'kg') {
    normalization = {
      calorieAmount: 100,
      calorieUnit: 'g',
    }
  }
  else if (unit === 'ml' || unit === 'l') {
    normalization = {
      calorieAmount: 100,
      calorieUnit: 'ml',
    }
  }

  return {
    ...normalization,
    calories: item.calories,
  }
}

function inferredIngredientType(name: string) {
  const normalized = name.toLocaleLowerCase()
  const producePattern = /pepper|onion|spinach|lettuce|lime|lemon|cilantro|jalapeño|jalapeno/
  const moreProducePattern = /avocado|tomato|garlic|potato|carrot/

  if (producePattern.test(normalized)
    || moreProducePattern.test(normalized)
    || /fruit|vegetable/.test(normalized)) {
    return 'vegetables & fruit'
  }
  if (/bean|chickpea|lentil|tofu|tempeh|meat|chicken|beef|pork|fish/.test(normalized)) {
    return 'protein'
  }
  if (/rice|pasta|noodle|tortilla|bread|flour|oat|quinoa|couscous/.test(normalized)) {
    return 'grains, pasta & bread'
  }
  if (/milk|cheese|yogurt|yoghurt|butter|egg/.test(normalized)) {
    return 'dairy & eggs'
  }
  if (/salt|pepper|seasoning|spice|herb|cumin|paprika|chili|chilli/.test(normalized)) {
    return 'herbs & seasonings'
  }
  if (/oil|salsa|sauce|dressing|vinegar|mayonnaise|guacamole/.test(normalized)) {
    return 'sauces, oils & condiments'
  }

  return 'other'
}

function capitalizeIngredientName(value: string) {
  return value ? `${value[0]?.toLocaleUpperCase()}${value.slice(1)}` : value
}

function importedTypeId(
  item: ImportedRecipe['ingredients'][number],
  typeByName: Map<string, { id: string }>,
  fallbackType?: { id: string },
) {
  const declaredType = item.category
    ? typeByName.get(item.category.trim().toLocaleLowerCase())
    : undefined

  return declaredType?.id || typeByName.get(inferredIngredientType(item.name))?.id || fallbackType?.id || null
}

function ingredientKey(name: string, unit: string | null) {
  return `${name.toLocaleLowerCase().replaceAll(/[^a-z0-9]+/g, '')}:${unit || ''}`
}

function ingredientLibraryKey(name: string) {
  return name
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036F]/g, '')
    .toLocaleLowerCase()
    .replaceAll(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => {
      if (word.endsWith('ies')) {
        return `${word.slice(0, -3)}y`
      }
      if (word.endsWith('oes')) {
        return `${word.slice(0, -2)}`
      }
      if (/(?:ches|shes|sses|xes|zes)$/.test(word)) {
        return word.slice(0, -2)
      }
      if (word.endsWith('s') && !/(?:ss|us|is)$/.test(word)) {
        return word.slice(0, -1)
      }

      return word
    })
    .join(' ')
}

function normalizedImportedIngredients(items: ImportedRecipe['ingredients']) {
  const splitItems = items.flatMap((item) => {
    const alternatives = item.name.split(/\s+or\s+/i).map((name) => name.trim()).filter(Boolean)

    if (alternatives.length > 1) {
      return alternatives.map((name) => ({
        ...item,
        isOptional: true,
        name,
      }))
    }

    const ingredients = item.name.split(/\s+(?:and|&)\s+/i).map((name) => name.trim()).filter(Boolean)

    return ingredients.length > 1
      ? ingredients.map((name) => ({
          ...item,
          name,
        }))
      : [
          item,
        ]
  }).map((item) => ({
    ...item,
    name: capitalizeIngredientName(item.name),
  }))
  const merged = new Map<string, ImportedRecipe['ingredients'][number]>()

  for (const item of splitItems) {
    const key = `${ingredientKey(item.name, item.unit)}:${item.groupName || ''}`
    const existing = merged.get(key)

    if (!existing) {
      merged.set(key, item)

      continue
    }

    merged.set(key, {
      ...existing,
      isOptional: existing.isOptional && item.isOptional,
      amount: existing.amount !== null && item.amount !== null
        ? existing.amount + item.amount
        : existing.amount ?? item.amount,
    })
  }

  return [
    ...merged.values(),
  ]
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
  groupName: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(120)))),
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
  ingredientSections: v.optional(v.array(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(120)))),
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
    variants,
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
    db.query.ingredientVariant.findMany(),
  ])

  const variantsByIngredientId = new Map<string, typeof variants>()

  variants.forEach((variant) => {
    const items = variantsByIngredientId.get(variant.ingredientId) || []

    items.push(variant)
    variantsByIngredientId.set(variant.ingredientId, items)
  })

  return {
    ingredients: ingredients.map((item) => ({
      ...item,
      variants: variantsByIngredientId.get(item.id) || [],
    })),
    labels,
    types,
  }
})

const ingredientVariantInput = v.object({
  isDefault: v.optional(v.boolean()),
  name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(120)),
  calorieAmount: v.optional(v.nullable(v.pipe(v.number(), v.minValue(0.001), v.maxValue(100_000)))),
  calories: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(100_000)))),
  calorieUnit: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(30)))),
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
  requiresWeight: v.optional(v.boolean()),
  variants: v.optional(v.pipe(v.array(ingredientVariantInput), v.minLength(1))),
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
  const created = await db.transaction(async (tx) => {
    const variants = input.variants || [
      {
        name: 'Generic',
        calorieAmount: input.calorieAmount ?? null,
        calories: input.calories ?? input.caloriesPer100g ?? null,
        calorieUnit: input.calorieUnit ?? (input.caloriesPer100g ? 'g' : null),
        isDefault: true,
      },
    ]
    const defaultVariant = variants.find((item) => item.isDefault) || variants[0]
    const [
      newIngredient,
    ] = await tx.insert(ingredient).values({
      ...input,
      createdById: context.user.id,
      name: capitalizeIngredientName(input.name),
      calorieAmount: defaultVariant?.calorieAmount ?? null,
      calories: defaultVariant?.calories ?? null,
      caloriesPer100g: null,
      calorieUnit: defaultVariant?.calorieUnit ?? null,
      requiresWeight: input.requiresWeight ? 1 : 0,
    }).returning()

    if (!newIngredient) {
      throw new ORPCError('INTERNAL_SERVER_ERROR')
    }

    await tx.insert(ingredientVariant).values(variants.map((variant, index) => ({
      ...variant,
      ingredientId: newIngredient.id,
      isDefault: variant.isDefault || (!variants.some((item) => item.isDefault) && index === 0) ? 1 : 0,
    })))

    return newIngredient
  })

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
  requiresWeight: v.optional(v.boolean()),
  variants: v.optional(v.pipe(v.array(ingredientVariantInput), v.minLength(1))),
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
  const updated = await db.transaction(async (tx) => {
    const variants = input.variants
    const defaultVariant = variants?.find((item) => item.isDefault) || variants?.[0]
    const requiresWeight = input.requiresWeight === undefined
      ? undefined
      : Number(input.requiresWeight)
    const [
      changed,
    ] = await tx.update(ingredient).set({
      typeId: input.typeId,
      name: input.name ? capitalizeIngredientName(input.name) : undefined,
      calorieAmount: defaultVariant?.calorieAmount ?? input.calorieAmount,
      calories: defaultVariant?.calories ?? input.calories,
      caloriesPer100g: input.caloriesPer100g,
      calorieUnit: defaultVariant?.calorieUnit ?? input.calorieUnit,
      defaultUnit: input.defaultUnit,
      gramsPerUnit: input.gramsPerUnit,
      requiresWeight,
    }).where(and(eq(ingredient.id, input.id), eq(ingredient.createdById, context.user.id))).returning()

    if (!changed || !variants) {
      return changed
    }

    await tx.delete(ingredientVariant).where(eq(ingredientVariant.ingredientId, changed.id))
    await tx.insert(ingredientVariant).values(variants.map((variant, index) => ({
      ...variant,
      ingredientId: changed.id,
      isDefault: variant.isDefault || (!variants.some((item) => item.isDefault) && index === 0) ? 1 : 0,
    })))

    return changed
  })

  if (!updated) {
    throw new ORPCError('NOT_FOUND')
  }

  return updated
})

const createIngredientVariant = protectedProcedure.input(v.object({
  ingredientId: v.pipe(v.string(), v.uuid()),
  name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(120)),
  calorieAmount: v.optional(v.nullable(v.pipe(v.number(), v.minValue(0.001), v.maxValue(100_000)))),
  calories: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(100_000)))),
  calorieUnit: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(30)))),
})).handler(async ({
  context, input,
}) => {
  const savedIngredient = await db.query.ingredient.findFirst({
    where: and(
      eq(ingredient.id, input.ingredientId),
      eq(ingredient.createdById, context.user.id),
    ),
  })

  if (!savedIngredient) {
    throw new ORPCError('NOT_FOUND')
  }

  const [
    created,
  ] = await db.insert(ingredientVariant).values({
    ...input,
    isDefault: 0,
  }).returning()

  if (!created) {
    throw new ORPCError('INTERNAL_SERVER_ERROR')
  }

  return created
})

const deleteIngredient = protectedProcedure.input(v.object({
  id: v.pipe(v.string(), v.uuid()),
})).handler(async ({
  context, input,
}) => {
  const deleted = await db.transaction(async (tx) => {
    await tx.delete(recipeIngredient).where(eq(recipeIngredient.ingredientId, input.id))

    return tx.delete(ingredient).where(and(
      eq(ingredient.id, input.id),
      eq(ingredient.createdById, context.user.id),
    )).returning({
      id: ingredient.id,
    })
  })

  if (!deleted[0]) {
    throw new ORPCError('NOT_FOUND')
  }
})

const deleteIngredients = protectedProcedure.input(v.object({
  ids: v.pipe(v.array(v.pipe(v.string(), v.uuid())), v.minLength(1)),
})).handler(async ({
  context, input,
}) => {
  const ids = [
    ...new Set(input.ids),
  ]

  const deleted = await db.transaction(async (tx) => {
    await tx.delete(recipeIngredient).where(inArray(recipeIngredient.ingredientId, ids))

    return tx.delete(ingredient).where(and(
      eq(ingredient.createdById, context.user.id),
      inArray(ingredient.id, ids),
    )).returning({
      id: ingredient.id,
    })
  })

  if (deleted.length !== ids.length) {
    throw new ORPCError('NOT_FOUND')
  }
})

const getIngredientUsage = protectedProcedure.input(v.object({
  id: v.pipe(v.string(), v.uuid()),
})).handler(async ({
  context, input,
}) => {
  const savedIngredient = await db.query.ingredient.findFirst({
    where: and(eq(ingredient.id, input.id), eq(ingredient.createdById, context.user.id)),
  })

  if (!savedIngredient) {
    throw new ORPCError('NOT_FOUND')
  }

  const usage = await db.query.recipeIngredient.findMany({
    columns: {
      recipeId: true,
    },
    where: eq(recipeIngredient.ingredientId, input.id),
  })
  const recipeIds = [
    ...new Set(usage.map((item) => item.recipeId)),
  ]

  if (recipeIds.length === 0) {
    return []
  }

  return db.query.recipe.findMany({
    columns: {
      id: true,
      name: true,
    },
    orderBy: (table) => asc(table.name),
    where: and(eq(recipe.createdById, context.user.id), inArray(recipe.id, recipeIds)),
  })
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

const deleteIngredientType = protectedProcedure.input(v.object({
  id: v.pipe(v.string(), v.uuid()),
})).handler(async ({
  context, input,
}) => {
  const deleted = await db.delete(ingredientType).where(and(
    eq(ingredientType.id, input.id),
    eq(ingredientType.createdById, context.user.id),
  )).returning({
    id: ingredientType.id,
  })

  if (!deleted[0]) {
    throw new ORPCError('NOT_FOUND')
  }
})

const listRecipes = publicProcedure.input(v.object({
  archived: v.optional(v.boolean()),
})).handler(async ({
  input,
}) => {
  const recipes = await db.query.recipe.findMany({
    orderBy: (table) => desc(table.createdAt),
    where: (table) => input.archived ? isNotNull(table.archivedAt) : isNull(table.archivedAt),
  })
  const imageIds = recipes.flatMap((savedRecipe) => savedRecipe.imageId
    ? [
        savedRecipe.imageId,
      ]
    : [])
  const recipeIds = recipes.map((savedRecipe) => savedRecipe.id)
  const [
    images,
    recipeIngredients,
    cookingHistory,
  ] = await Promise.all([
    imageIds.length === 0
      ? []
      : db.query.imageAsset.findMany({
          where: inArray(imageAsset.id, imageIds),
        }),
    recipeIds.length === 0
      ? []
      : db.query.recipeIngredient.findMany({
          where: inArray(recipeIngredient.recipeId, recipeIds),
        }),
    recipeIds.length === 0
      ? []
      : db.query.recipeCooking.findMany({
          columns: {
            recipeId: true,
            createdAt: true,
          },
          where: inArray(recipeCooking.recipeId, recipeIds),
        }),
  ])
  const ingredientIds = recipeIngredients.map((item) => item.ingredientId)
  const ingredients = ingredientIds.length === 0
    ? []
    : await db.query.ingredient.findMany({
        columns: {
          id: true,
          name: true,
        },
        where: inArray(ingredient.id, ingredientIds),
      })
  const imageById = new Map(images.map((image) => [
    image.id,
    image,
  ]))
  const ingredientNameById = new Map(ingredients.map((item) => [
    item.id,
    item.name,
  ]))
  const ingredientNamesByRecipeId = new Map<string, string[]>()
  const lastCookedAtByRecipeId = new Map<string, Date>()

  for (const entry of cookingHistory) {
    const previous = lastCookedAtByRecipeId.get(entry.recipeId)

    if (!previous || entry.createdAt > previous) {
      lastCookedAtByRecipeId.set(entry.recipeId, entry.createdAt)
    }
  }

  for (const item of recipeIngredients) {
    const ingredientName = ingredientNameById.get(item.ingredientId)

    if (!ingredientName) {
      continue
    }

    const recipeIngredientNames = ingredientNamesByRecipeId.get(item.recipeId) || []

    recipeIngredientNames.push(ingredientName)
    ingredientNamesByRecipeId.set(item.recipeId, recipeIngredientNames)
  }

  return Promise.all(recipes.map(async (savedRecipe) => {
    const image = savedRecipe.imageId ? imageById.get(savedRecipe.imageId) : undefined

    return {
      ...savedRecipe,
      lastCookedAt: lastCookedAtByRecipeId.get(savedRecipe.id) || null,
      image: image
        ? {
            id: image.id,
            url: await createReadUrl(image.variantKeys.desktop),
          }
        : null,
      ingredients: ingredientNamesByRecipeId.get(savedRecipe.id) || [],
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

const getRecipeForCooking = publicProcedure.input(v.object({
  id: v.pipe(v.string(), v.uuid()),
})).handler(async ({
  input,
}) => {
  const savedRecipe = await db.query.recipe.findFirst({
    where: eq(recipe.id, input.id),
  })

  if (!savedRecipe) {
    throw new ORPCError('NOT_FOUND')
  }

  const [
    recipeIngredients,
    steps,
    image,
  ] = await Promise.all([
    db.query.recipeIngredient.findMany({
      orderBy: (table) => asc(table.sortOrder),
      where: eq(recipeIngredient.recipeId, savedRecipe.id),
    }),
    db.query.recipeStep.findMany({
      orderBy: (table) => asc(table.sortOrder),
      where: eq(recipeStep.recipeId, savedRecipe.id),
    }),
    savedRecipe.imageId
      ? db.query.imageAsset.findFirst({
          where: eq(imageAsset.id, savedRecipe.imageId),
        })
      : undefined,
  ])
  const ingredientIds = recipeIngredients.map((item) => item.ingredientId)
  const savedIngredients = ingredientIds.length === 0
    ? []
    : await db.query.ingredient.findMany({
        where: inArray(ingredient.id, ingredientIds),
      })
  const variants = ingredientIds.length === 0
    ? []
    : await db.query.ingredientVariant.findMany({
        where: inArray(ingredientVariant.ingredientId, ingredientIds),
      })
  const ingredientById = new Map(savedIngredients.map((item) => [
    item.id,
    item,
  ]))
  const typeIds = savedIngredients.flatMap((item) => item.typeId
    ? [
        item.typeId,
      ]
    : [])
  const savedTypes = typeIds.length === 0
    ? []
    : await db.query.ingredientType.findMany({
        orderBy: (table) => asc(table.sortOrder),
        where: inArray(ingredientType.id, typeIds),
      })
  const typeById = new Map(savedTypes.map((item) => [
    item.id,
    item,
  ]))
  const variantsByIngredientId = new Map<string, typeof variants>()

  variants.forEach((variant) => {
    const items = variantsByIngredientId.get(variant.ingredientId) || []

    items.push(variant)
    variantsByIngredientId.set(variant.ingredientId, items)
  })

  return {
    ...savedRecipe,
    image: image
      ? {
          url: await createReadUrl(image.variantKeys.desktop),
        }
      : null,
    ingredients: recipeIngredients.flatMap((item) => {
      const savedIngredient = ingredientById.get(item.ingredientId)
      const type = savedIngredient?.typeId
        ? typeById.get(savedIngredient.typeId)
        : undefined

      return savedIngredient
        ? [
            {
              id: item.id,
              ingredientId: savedIngredient.id,
              isOptional: Boolean(item.isOptional),
              name: savedIngredient.name,
              amount: item.amount,
              groupName: item.groupName,
              note: item.note,
              requiresWeight: Boolean(savedIngredient.requiresWeight),
              type: type?.name || 'Other',
              typeIcon: type?.icon || 'i-lucide-package',
              typeSortOrder: type?.sortOrder || Number.MAX_SAFE_INTEGER,
              unit: item.unit || savedIngredient.defaultUnit,
              variants: (variantsByIngredientId.get(savedIngredient.id) || []).sort(
                (left, right) => right.isDefault - left.isDefault,
              ),
            },
          ]
        : []
    }),
    steps,
  }
})

const completeRecipeCooking = publicProcedure.input(v.object({
  recipeId: v.pipe(v.string(), v.uuid()),
  calories: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(1_000_000)))),
  ingredientUsage: v.optional(v.array(v.object({
    ingredientId: v.pipe(v.string(), v.uuid()),
    variantId: v.optional(v.pipe(v.string(), v.uuid())),
    weight: v.optional(v.nullable(v.pipe(v.number(), v.minValue(0), v.maxValue(100_000)))),
  }))),
  note: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(2000))),
})).handler(async ({
  input,
}) => {
  const savedRecipe = await db.query.recipe.findFirst({
    where: eq(recipe.id, input.recipeId),
  })

  if (!savedRecipe) {
    throw new ORPCError('NOT_FOUND')
  }

  const [
    cooking,
  ] = await db.insert(recipeCooking).values({
    createdById: savedRecipe.createdById,
    recipeId: savedRecipe.id,
    calories: input.calories ?? null,
    ingredientUsage: input.ingredientUsage || [],
    note: input.note || null,
  }).returning()

  return cooking
})

const listRecipeCookingHistory = protectedProcedure.handler(async ({
  context,
}) => {
  const history = await db.query.recipeCooking.findMany({
    orderBy: (table) => desc(table.createdAt),
    where: eq(recipeCooking.createdById, context.user.id),
  })
  const recipeIds = history.map((entry) => entry.recipeId)
  const recipes = recipeIds.length === 0
    ? []
    : await db.query.recipe.findMany({
        where: inArray(recipe.id, recipeIds),
      })
  const recipeById = new Map(recipes.map((item) => [
    item.id,
    item,
  ]))

  return history.flatMap((entry) => {
    const savedRecipe = recipeById.get(entry.recipeId)

    return savedRecipe
      ? [
          {
            ...entry,
            recipeName: savedRecipe.name,
          },
        ]
      : []
  })
})

const deleteRecipeCookingHistory = protectedProcedure.input(v.object({
  id: v.pipe(v.string(), v.uuid()),
})).handler(async ({
  context, input,
}) => {
  const [
    deleted,
  ] = await db.delete(recipeCooking).where(and(
    eq(recipeCooking.id, input.id),
    eq(recipeCooking.createdById, context.user.id),
  )).returning({
    id: recipeCooking.id,
  })

  if (!deleted) {
    throw new ORPCError('NOT_FOUND')
  }

  return deleted
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
      ingredientSections: input.ingredientSections || [],
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

async function saveImportedRecipe(input: {
  imageId?: string
  userId: string
  imported: ImportedRecipe
  sourceName?: string
  sourceUrl?: string
}) {
  const [
    existingIngredients,
    ingredientTypes,
  ] = await Promise.all([
    db.query.ingredient.findMany({
      where: eq(ingredient.createdById, input.userId),
    }),
    db.query.ingredientType.findMany({
      where: eq(ingredientType.createdById, input.userId),
    }),
  ])
  const ingredientByName = new Map(existingIngredients.map((item) => [
    ingredientLibraryKey(item.name),
    item,
  ]))
  const typeByName = new Map(ingredientTypes.map((item) => [
    item.name.trim().toLocaleLowerCase(),
    item,
  ]))
  const fallbackType = typeByName.get('other')
  const importedIngredients = normalizedImportedIngredients(input.imported.ingredients)
  const savedIngredients = await db.transaction(async (tx) => {
    const result: Array<typeof existingIngredients[number]> = []

    for (const item of importedIngredients) {
      const key = ingredientLibraryKey(item.name)
      let savedIngredient = ingredientByName.get(key)
      const typeId = importedTypeId(item, typeByName, fallbackType)
      const name = capitalizeIngredientName(item.name)

      if (!savedIngredient) {
        const nutrition = normalizeImportedNutrition(item)
        const [
          created,
        ] = await tx.insert(ingredient).values({
          createdById: input.userId,
          typeId,
          name,
          calorieAmount: nutrition.calorieAmount,
          calories: nutrition.calories,
          calorieUnit: nutrition.calorieUnit,
          defaultUnit: item.defaultUnit || nutrition.calorieUnit || item.unit,
          requiresWeight: item.requiresWeight ? 1 : 0,
        }).returning()

        if (!created) {
          throw new ORPCError('INTERNAL_SERVER_ERROR')
        }

        await tx.insert(ingredientVariant).values({
          ingredientId: created.id,
          isDefault: 1,
          name: 'Generic',
          calorieAmount: nutrition.calorieAmount,
          calories: nutrition.calories,
          calorieUnit: nutrition.calorieUnit,
        })

        savedIngredient = created
        ingredientByName.set(key, created)
      }
      else if (savedIngredient.typeId === fallbackType?.id && typeId && typeId !== fallbackType.id) {
        const [
          updated,
        ] = await tx.update(ingredient).set({
          typeId: typeId || savedIngredient.typeId,
          name,
        }).where(eq(ingredient.id, savedIngredient.id)).returning()

        if (updated) {
          savedIngredient = updated
          ingredientByName.set(key, updated)
        }
      }

      result.push(savedIngredient)
    }

    return result
  })
  const recipeIngredients = importedIngredients.map((item, index) => ({
    ...item,
    ingredientId: savedIngredients[index]?.id,
  })).filter((item): item is typeof item & {
    ingredientId: string
  } => Boolean(item.ingredientId))
  const calories = calculateRecipeCalories(recipeIngredients, savedIngredients)

  return await db.transaction(async (tx) => {
    const [
      created,
    ] = await tx.insert(recipe).values({
      createdById: input.userId,
      imageId: input.imageId || null,
      name: input.imported.name,
      calories,
      cookTimeMinutes: input.imported.cookTimeMinutes,
      cuisine: input.imported.cuisine || null,
      defaultPortions: input.imported.defaultPortions,
      description: input.imported.description || null,
      ingredientSections: [
        ...new Set(recipeIngredients.flatMap((item) => item.groupName
          ? [
              item.groupName,
            ]
          : [])),
      ],
      prepTimeMinutes: input.imported.prepTimeMinutes,
      sourceName: input.sourceName || null,
      sourceUrl: input.sourceUrl || null,
      tags: input.imported.tags,
    }).returning()

    if (!created) {
      throw new ORPCError('INTERNAL_SERVER_ERROR')
    }

    if (recipeIngredients.length > 0) {
      await tx.insert(recipeIngredient).values(recipeIngredients.map((item, sortOrder) => ({
        ingredientId: item.ingredientId,
        recipeId: created.id,
        isOptional: item.isOptional ? 1 : 0,
        amount: item.amount,
        groupName: item.groupName,
        note: item.note,
        sortOrder,
        unit: item.unit,
      })))
    }
    if (input.imported.steps.length > 0) {
      await tx.insert(recipeStep).values(input.imported.steps.map((item, sortOrder) => ({
        recipeId: created.id,
        durationSeconds: item.type === 'timer' ? item.durationSeconds : null,
        instruction: item.instruction,
        sortOrder,
        type: item.type,
      })))
    }

    const labels = toRecipeLabels({
      cuisine: input.imported.cuisine,
      sourceName: input.sourceName,
      tags: input.imported.tags,
    })

    if (labels.length > 0) {
      await tx.insert(recipeLabel).values(labels.map((label) => ({
        ...label,
        createdById: input.userId,
      }))).onConflictDoNothing()
    }

    return created
  })
}

async function processRecipeImport(jobId: string) {
  const job = await db.query.recipeImportJob.findFirst({
    where: eq(recipeImportJob.id, jobId),
  })

  if (!job) {
    return
  }

  try {
    await db.update(recipeImportJob).set({
      updatedAt: new Date(),
      status: 'processing',
    }).where(eq(recipeImportJob.id, job.id))
    await ensureDefaultIngredientTypes(job.createdById)

    let imported: ImportedRecipe
    let sourceName: string | undefined
    let sourceUrl: string | undefined

    if (job.imageId) {
      const uploadedImage = await db.query.imageAsset.findFirst({
        where: and(eq(imageAsset.id, job.imageId), eq(imageAsset.createdById, job.createdById)),
      })

      if (!uploadedImage) {
        throw new Error('The uploaded image is no longer available.')
      }

      imported = await extractRecipeFromImage(await readObject(uploadedImage.variantKeys.full))
    }
    else if (job.sourceUrl) {
      const page = await fetchRecipePageText(job.sourceUrl)

      imported = await extractRecipeFromText(page.text)
      sourceName = page.sourceName
      sourceUrl = page.sourceUrl
    }
    else if (job.sourceText) {
      imported = await extractRecipeFromText(job.sourceText)
    }
    else {
      throw new Error('This import has no source.')
    }

    await db.update(recipeImportJob).set({
      updatedAt: new Date(),
      draft: {
        ...imported,
        sourceName,
        sourceUrl,
      },
      status: 'review',
    }).where(eq(recipeImportJob.id, job.id))
  }
  catch (error) {
    console.error('[Recipe import] Background import failed.', error)
    await db.update(recipeImportJob).set({
      updatedAt: new Date(),
      error: error instanceof Error ? error.message : 'We could not import that recipe.',
      status: 'failed',
    }).where(eq(recipeImportJob.id, jobId))
  }
}

async function queueRecipeImport(input: {
  imageId?: string
  userId: string
  sourceText?: string
  sourceUrl?: string
}) {
  const [
    job,
  ] = await db.insert(recipeImportJob).values({
    createdById: input.userId,
    imageId: input.imageId || null,
    sourceText: input.sourceText || null,
    sourceUrl: input.sourceUrl || null,
  }).returning()

  if (!job) {
    throw new ORPCError('INTERNAL_SERVER_ERROR')
  }

  void processRecipeImport(job.id)

  return job
}

const importRecipeFromImage = protectedProcedure.input(v.object({
  imageId: v.pipe(v.string(), v.uuid()),
})).handler(async ({
  context, input,
}) => {
  await assertOwnImage(context.user.id, input.imageId)

  return await queueRecipeImport({
    imageId: input.imageId,
    userId: context.user.id,
  })
})

const importRecipeFromText = protectedProcedure.input(v.object({
  text: v.pipe(v.string(), v.trim(), v.minLength(20), v.maxLength(60_000)),
})).handler(async ({
  context, input,
}) => {
  return await queueRecipeImport({
    userId: context.user.id,
    sourceText: input.text,
  })
})

const importRecipeFromUrl = protectedProcedure.input(v.object({
  url: v.pipe(v.string(), v.trim(), v.url(), v.maxLength(2000)),
})).handler(async ({
  context, input,
}) => {
  return await queueRecipeImport({
    userId: context.user.id,
    sourceUrl: input.url,
  })
})

const getRecipeImport = protectedProcedure.input(v.object({
  id: v.pipe(v.string(), v.uuid()),
})).handler(async ({
  context, input,
}) => {
  const job = await db.query.recipeImportJob.findFirst({
    where: and(eq(recipeImportJob.id, input.id), eq(recipeImportJob.createdById, context.user.id)),
  })

  if (!job || job.status !== 'review' || !job.draft) {
    throw new ORPCError('NOT_FOUND')
  }

  return job
})

const finalizeRecipeImport = protectedProcedure.input(v.object({
  id: v.pipe(v.string(), v.uuid()),
  draft: v.unknown(),
})).handler(async ({
  context, input,
}) => {
  const job = await db.query.recipeImportJob.findFirst({
    where: and(eq(recipeImportJob.id, input.id), eq(recipeImportJob.createdById, context.user.id)),
  })

  if (!job || job.status !== 'review') {
    throw new ORPCError('NOT_FOUND')
  }

  const metadata = job.draft as { sourceName?: string
    sourceUrl?: string } | null
  const savedRecipe = await saveImportedRecipe({
    imageId: job.imageId || undefined,
    userId: context.user.id,
    imported: parseImportedRecipe(input.draft),
    sourceName: metadata?.sourceName,
    sourceUrl: metadata?.sourceUrl,
  })

  await db.update(recipeImportJob).set({
    recipeId: savedRecipe.id,
    updatedAt: new Date(),
    status: 'completed',
  }).where(eq(recipeImportJob.id, job.id))

  return savedRecipe
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
      ingredientSections: input.ingredientSections || [],
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

const setRecipeFavorite = protectedProcedure.input(v.object({
  id: v.pipe(v.string(), v.uuid()),
  isFavorite: v.boolean(),
})).handler(async ({
  context, input,
}) => {
  const [
    updated,
  ] = await db.update(recipe).set({
    updatedAt: new Date(),
    isFavorite: input.isFavorite,
  }).where(and(eq(recipe.id, input.id), eq(recipe.createdById, context.user.id))).returning()

  if (!updated) {
    throw new ORPCError('NOT_FOUND')
  }

  return updated
})

const archiveRecipe = protectedProcedure.input(v.object({
  id: v.pipe(v.string(), v.uuid()),
})).handler(async ({
  context, input,
}) => {
  const [
    updated,
  ] = await db.update(recipe).set({
    archivedAt: new Date(),
    updatedAt: new Date(),
  }).where(and(eq(recipe.id, input.id), eq(recipe.createdById, context.user.id))).returning({
    id: recipe.id,
  })

  if (!updated) {
    throw new ORPCError('NOT_FOUND')
  }

  return updated
})

const restoreRecipe = protectedProcedure.input(v.object({
  id: v.pipe(v.string(), v.uuid()),
})).handler(async ({
  context, input,
}) => {
  const [
    updated,
  ] = await db.update(recipe).set({
    archivedAt: null,
    updatedAt: new Date(),
  }).where(and(eq(recipe.id, input.id), eq(recipe.createdById, context.user.id))).returning({
    id: recipe.id,
  })

  if (!updated) {
    throw new ORPCError('NOT_FOUND')
  }

  return updated
})

const duplicateRecipe = protectedProcedure.input(v.object({
  id: v.pipe(v.string(), v.uuid()),
})).handler(async ({
  context, input,
}) => {
  const original = await db.query.recipe.findFirst({
    where: and(eq(recipe.id, input.id), eq(recipe.createdById, context.user.id)),
  })

  if (!original) {
    throw new ORPCError('NOT_FOUND')
  }

  const [
    ingredients,
    steps,
  ] = await Promise.all([
    db.query.recipeIngredient.findMany({
      orderBy: (table) => asc(table.sortOrder),
      where: eq(recipeIngredient.recipeId, original.id),
    }),
    db.query.recipeStep.findMany({
      orderBy: (table) => asc(table.sortOrder),
      where: eq(recipeStep.recipeId, original.id),
    }),
  ])

  return db.transaction(async (tx) => {
    const [
      copy,
    ] = await tx.insert(recipe).values({
      ...original,
      id: undefined,
      archivedAt: null,
      createdAt: undefined,
      updatedAt: new Date(),
      isFavorite: false,
      name: `${original.name} copy`,
    }).returning()

    if (!copy) {
      throw new ORPCError('INTERNAL_SERVER_ERROR')
    }

    if (ingredients.length > 0) {
      await tx.insert(recipeIngredient).values(ingredients.map(({
        id,
        recipeId,
        ...item
      }) => ({
        ...item,
        recipeId: copy.id,
      })))
    }
    if (steps.length > 0) {
      await tx.insert(recipeStep).values(steps.map(({
        id,
        recipeId,
        ...item
      }) => ({
        ...item,
        recipeId: copy.id,
      })))
    }

    return copy
  })
})

const deleteRecipe = protectedProcedure.input(v.object({
  id: v.pipe(v.string(), v.uuid()),
})).handler(async ({
  context, input,
}) => {
  const deleted = await db.delete(recipe).where(and(
    eq(recipe.id, input.id),
    eq(recipe.createdById, context.user.id),
  )).returning({
    id: recipe.id,
  })

  if (!deleted[0]) {
    throw new ORPCError('NOT_FOUND')
  }
})

export const recipesRouter = {
  archiveRecipe,
  completeRecipeCooking,
  createIngredient,
  createIngredientType,
  createIngredientVariant,
  createRecipe,
  createRecipeLabel,
  deleteIngredient,
  deleteIngredients,
  deleteIngredientType,
  deleteRecipe,
  deleteRecipeCookingHistory,
  duplicateRecipe,
  finalizeRecipeImport,
  getIngredientUsage,
  getRecipe,
  getRecipeForCooking,
  getRecipeImport,
  importRecipeFromImage,
  importRecipeFromText,
  importRecipeFromUrl,
  listRecipeCookingHistory,
  listRecipeFormData,
  listRecipes,
  restoreRecipe,
  setRecipeFavorite,
  updateIngredient,
  updateIngredientType,
  updateRecipe,
}
