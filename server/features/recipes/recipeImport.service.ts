import { createOpenAI } from '@ai-sdk/openai'
import {
  generateText,
  stepCountIs,
  tool,
} from 'ai'
import { z } from 'zod'

const importedIngredientSchema = z.object({
  isOptional: z.boolean(),
  name: z.string().trim().min(1).max(120),
  amount: z.number().nonnegative().nullable(),
  calorieAmount: z.number().positive().max(100_000),
  calories: z.number().int().nonnegative().max(100_000),
  category: z.string().trim().max(80).nullable(),
  defaultUnit: z.string().trim().max(30).nullable(),
  note: z.string().trim().max(240).nullable(),
  nutritionUnit: z.string().trim().max(30).nullable(),
  unit: z.string().trim().max(30).nullable(),
})

const importedRecipeSchema = z.object({
  name: z.string().trim().min(1).max(180),
  cookTimeMinutes: z.number().int().nonnegative().max(1440).nullable(),
  cuisine: z.string().trim().max(80).nullable(),
  defaultPortions: z.number().int().min(1).max(100),
  description: z.string().trim().max(2000).nullable(),
  ingredients: z.array(importedIngredientSchema).max(100),
  prepTimeMinutes: z.number().int().nonnegative().max(1440).nullable(),
  steps: z.array(z.object({
    instruction: z.string().trim().min(1).max(2000),
  })).max(100),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
})

export type ImportedRecipe = z.infer<typeof importedRecipeSchema>

/**
 * The importer deliberately has a single, constrained tool: extraction can
 * describe a recipe, but it cannot perform any arbitrary action for a user.
 */
export function makeRecipeImportTools() {
  return {
    create_recipe_draft: tool({
      description: 'Create a complete recipe draft from the supplied recipe image. Only include information that is readable or clearly implied by the image; use null when unknown.',
      execute: (input) => Promise.resolve(input),
      inputSchema: importedRecipeSchema,
    }),
  }
}

export async function extractRecipeFromImage(image: Uint8Array): Promise<ImportedRecipe> {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY must be configured before recipe import can be used.')
  }

  const openai = createOpenAI({
    apiKey,
  })
  const result = await generateText({
    instructions: `You extract recipes from images into a cooking app. Read the supplied recipe image carefully and call create_recipe_draft exactly once. Use only these units: g, kg, ml, l, tsp, tbsp, amount, can, package. unit is the recipe quantity's unit. defaultUnit and nutritionUnit describe the newly created ingredient itself and must be sensible normalized values, not copied from the recipe quantity. For example, “1 can Tomato Purée” may use unit “can” in the recipe, but defaultUnit and nutritionUnit should be “g”, with calories per 100 g. For a countable ingredient, use its singular title-cased name and the unit amount: for example “2 bell peppers” becomes name “Bell Pepper”, amount 2, unit “amount”, defaultUnit “amount”, nutritionUnit “amount”. Give every ingredient a broad grocery category when possible (for example Vegetables & fruit, Protein, Grains, pasta & bread, Dairy & eggs, Canned & jarred, Herbs & seasonings, Sauces, oils & condiments, Baking, Frozen, or Other). Estimate calories for every ingredient as an integer, but always normalize the nutrition baseline: g and kg must be calories per 100 g; ml and l must be calories per 100 ml; amount, can, package, tsp, and tbsp must be calories per 1 of that unit. The calorie baseline must never use the recipe quantity. Do not invent timings, sources, or ingredients that are not in the image. Use concise complete cooking steps.`,
    messages: [
      {
        content: [
          {
            text: 'Import the recipe in this image into the app.',
            type: 'text',
          },
          {
            data: image,
            mediaType: 'image/webp',
            type: 'file',
          },
        ],
        role: 'user',
      },
    ],
    model: openai(process.env.OPENAI_RECIPE_IMPORT_MODEL || process.env.OPENAI_RECIPE_MODEL || 'gpt-5-mini'),
    stopWhen: stepCountIs(1),
    toolChoice: {
      toolName: 'create_recipe_draft',
      type: 'tool',
    },
    tools: makeRecipeImportTools(),
  })
  const imported = result.toolResults.find((entry) => entry.toolName === 'create_recipe_draft')?.output

  if (!imported) {
    throw new Error('The recipe import did not return a draft.')
  }

  return importedRecipeSchema.parse(imported)
}
