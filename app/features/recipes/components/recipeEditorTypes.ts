export interface IngredientRow {
  ingredientId: string | undefined
  isOptional: boolean
  amount: number | undefined
  calorieAmount: number | undefined
  calories: number | undefined
  calorieUnit: string | undefined
  note: string
  unit: string
}

export interface RecipeForm {
  imageId: string | null
  name: string
  caloriesOverride: number | undefined
  cookTimeMinutes: number | undefined
  cuisine: string
  defaultPortions: number
  description: string
  notes: string
  prepTimeMinutes: number | undefined
  sourceName: string
  sourceUrl: string
  tags: string[]
}

export interface StepRow {
  durationMinutes: number | undefined
  instruction: string
  type: 'group' | 'normal' | 'timer'
}
