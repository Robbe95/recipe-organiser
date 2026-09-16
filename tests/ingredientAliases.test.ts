import {
  describe,
  expect,
  it,
} from 'vitest'

import { parseImportedRecipe } from '../shared/recipeImport'
import { splitImportedIngredientName } from '../shared/utils/importIngredientName'
import {
  buildIngredientLookup,
  findIngredientNameConflict,
  normalizeIngredientAliases,
} from '../shared/utils/ingredientAliases'
import { ingredientLibraryKey } from '../shared/utils/ingredientLibraryKey'

const library = [
  {
    id: 'tomato',
    name: 'Tomatoes',
    aliases: [],
  },
  {
    id: 'spring-onion',
    name: 'Spring onion',
    aliases: [
      'Green onion',
      'Scallion',
    ],
  },
]

describe('ingredient matching', () => {
  it.each([
    'Tomato',
    '1 tomato',
    '2 tomatoes',
    '½ tomato',
    '1 1/2 tomatoes',
  ])('matches %s to Tomatoes', (name) => {
    expect(buildIngredientLookup(library).get(ingredientLibraryKey(name))?.id).toBe('tomato')
  })

  it.each([
    'Green onion',
    'green onions',
    '2 scallions',
  ])('matches %s through a saved alias', (name) => {
    expect(buildIngredientLookup(library).get(ingredientLibraryKey(name))?.id).toBe('spring-onion')
  })

  it('keeps distinct foods separate instead of guessing by similarity', () => {
    const lookup = buildIngredientLookup(library)

    expect(lookup.get(ingredientLibraryKey('Tomato paste'))).toBeUndefined()
    expect(lookup.get(ingredientLibraryKey('Red onion'))).toBeUndefined()
    expect(lookup.get(ingredientLibraryKey('Onion powder'))).toBeUndefined()
  })

  it('does not let an alias override a canonical ingredient name', () => {
    const lookup = buildIngredientLookup([
      ...library,
      {
        id: 'other',
        name: 'Other',
        aliases: [
          'Tomato',
        ],
      },
    ])

    expect(lookup.get(ingredientLibraryKey('Tomato'))?.id).toBe('tomato')
  })

  it('normalizes aliases without duplicates or the canonical name', () => {
    expect(normalizeIngredientAliases('Spring onion', [
      ' Green onion ',
      'green onions',
      'Spring onions',
      'Scallion',
    ])).toEqual([
      'Green onion',
      'Scallion',
    ])
  })

  it('detects conflicts against names and aliases belonging to another ingredient', () => {
    expect(findIngredientNameConflict(library, {
      id: 'other',
      name: 'Other',
      aliases: [
        'Tomato',
      ],
    })?.id).toBe('tomato')
    expect(findIngredientNameConflict(library, {
      id: 'other',
      name: 'Green onions',
      aliases: [],
    })?.id).toBe('spring-onion')
    expect(findIngredientNameConflict(library, library[1]!)).toBeUndefined()
  })
})

describe('imported quantities', () => {
  it('separates a quantity and measurement from the ingredient name', () => {
    expect(splitImportedIngredientName('200 grams of tomatoes')).toEqual({
      name: 'tomatoes',
      amount: 200,
      unit: 'g',
    })
    expect(splitImportedIngredientName('1½ tomatoes')).toEqual({
      name: 'tomatoes',
      amount: 1.5,
      unit: 'amount',
    })
  })

  it('preserves numbers that identify foods and does not parse invalid fractions', () => {
    expect(splitImportedIngredientName('5-spice powder').name).toBe('5-spice powder')
    expect(splitImportedIngredientName('5 spice powder').name).toBe('5 spice powder')
    expect(splitImportedIngredientName('1/0 tomatoes').amount).toBeNull()
  })

  it('cleans source names, fills missing quantity fields, and preserves extracted amounts', () => {
    const ingredient = {
      isOptional: false,
      name: '1 tomato',
      amount: null,
      calorieAmount: 100,
      calories: 18,
      category: null,
      defaultUnit: null,
      groupName: null,
      note: null,
      nutritionUnit: 'g',
      requiresWeight: false,
      unit: null,
    }
    const recipe = {
      name: 'Salad',
      cookTimeMinutes: null,
      cuisine: null,
      defaultPortions: 2,
      description: null,
      ingredients: [
        ingredient,
        {
          ...ingredient,
          amount: 3,
        },
      ],
      prepTimeMinutes: null,
      steps: [
        {
          durationSeconds: null,
          instruction: 'Slice the tomatoes.',
          type: 'normal',
        },
      ],
      tags: [],
    }
    const parsed = parseImportedRecipe(recipe)

    expect(parsed.ingredients[0]).toMatchObject({
      name: 'tomato',
      amount: 1,
      unit: 'amount',
    })
    expect(parsed.ingredients[1]).toMatchObject({
      name: 'tomato',
      amount: 3,
    })
  })
})
