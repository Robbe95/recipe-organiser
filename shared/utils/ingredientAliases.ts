import { ingredientLibraryKey } from './ingredientLibraryKey'

interface NamedIngredient {
  id: string
  name: string
  aliases?: readonly string[]
}

export function normalizeIngredientAliases(name: string, aliases: readonly string[]) {
  const seen = new Set([
    ingredientLibraryKey(name),
  ])

  return aliases.map((alias) => alias.trim()).filter((alias) => {
    const key = ingredientLibraryKey(alias)

    if (!key || seen.has(key)) {
      return false
    }

    seen.add(key)

    return true
  })
}

export function buildIngredientLookup<T extends NamedIngredient>(ingredients: readonly T[]) {
  const lookup = new Map(ingredients.map((item) => [
    ingredientLibraryKey(item.name),
    item,
  ]))

  for (const item of ingredients) {
    for (const alias of item.aliases || []) {
      const key = ingredientLibraryKey(alias)

      // A canonical name always takes precedence over an alias.
      if (!lookup.has(key)) {
        lookup.set(key, item)
      }
    }
  }

  return lookup
}

export function findIngredientNameConflict(ingredients: readonly NamedIngredient[], candidate: NamedIngredient) {
  const keys = new Set([
    candidate.name,
    ...candidate.aliases || [],
  ].map(ingredientLibraryKey))

  return ingredients.find((item) => item.id !== candidate.id
    && [
      item.name,
      ...item.aliases || [],
    ].some((name) => keys.has(ingredientLibraryKey(name))))
}
