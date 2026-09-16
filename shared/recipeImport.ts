import { z } from 'zod'

import { splitImportedIngredientName } from './utils/importIngredientName'
import { splitImportedRecipeSteps } from './utils/recipeInstructions'

const recipeUnits = [
  'g',
  'kg',
  'ml',
  'l',
  'tsp',
  'tbsp',
  'amount',
  'can',
  'package',
] as const

const importedIngredientSchema = z.object({
  isOptional: z.boolean(),
  isPantryStaple: z.boolean().default(false).describe('True only for ingredients a typical household normally keeps stocked, such as salt, black pepper, common dried herbs, cooking oil, vinegar, sugar, or flour. False for fresh food and recipe-specific purchases.'),
  name: z.string().trim().min(1).max(120),
  amount: z.number().nonnegative().nullable(),
  calorieAmount: z.number().positive().max(100_000).describe('Always use the round normalization baseline: 100.'),
  calories: z.number().int().nonnegative().max(100_000).describe('The rounded kcal value for 100 g or 100 ml, never for the recipe quantity.'),
  category: z.string().trim().max(80).nullable(),
  defaultUnit: z.enum(recipeUnits).nullable(),
  groupName: z.string().trim().min(1).max(120).nullable().describe('Copy the exact ingredient section heading above this item, for example “To serve” or “For the crispy fried mushrooms”; use null when the ingredient has no heading.'),
  note: z.string().trim().max(240).nullable(),
  nutritionUnit: z.enum(recipeUnits).nullable().describe('Use g for solids and ml for liquids; never use amount, can, package, tsp, or tbsp for imported nutrition.'),
  requiresWeight: z.boolean().default(false),
  unit: z.enum(recipeUnits).nullable(),
})

export const importedRecipeSchema = z.object({
  name: z.string().trim().min(1).max(180),
  cookTimeMinutes: z.number().int().nonnegative().max(1440).nullable(),
  cuisine: z.string().trim().max(80).nullable(),
  defaultPortions: z.number().int().min(1).max(100),
  description: z.string().trim().max(2000).nullable(),
  ingredients: z.array(importedIngredientSchema).min(1).max(100),
  prepTimeMinutes: z.number().int().nonnegative().max(1440).nullable(),
  steps: z.array(z.object({
    durationSeconds: z.number().int().positive().max(86_400).nullable(),
    instruction: z.string().trim().min(1).max(2000),
    type: z.enum([
      'normal',
      'timer',
    ]),
  })).min(1).max(100),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
})

export type ImportedRecipe = z.infer<typeof importedRecipeSchema>

export function parseImportedRecipe(input: unknown): ImportedRecipe {
  const recipe = importedRecipeSchema.parse(input)

  return importedRecipeSchema.parse({
    ...recipe,
    ingredients: recipe.ingredients.map((ingredient) => {
      const cleaned = splitImportedIngredientName(ingredient.name)

      return {
        ...ingredient,
        name: cleaned.name,
        amount: ingredient.amount ?? cleaned.amount,
        unit: ingredient.unit ?? cleaned.unit as typeof ingredient.unit,
      }
    }),
    steps: splitImportedRecipeSteps(recipe.steps),
  })
}
