const fractions: Record<string, number> = {
  '½': 0.5,
  '⅓': 1 / 3,
  '¼': 0.25,
  '⅛': 0.125,
  '⅔': 2 / 3,
  '¾': 0.75,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
}
const units: Record<string, string> = {
  can: 'can',
  cans: 'can',
  g: 'g',
  gram: 'g',
  grams: 'g',
  kg: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  l: 'l',
  liter: 'l',
  liters: 'l',
  milliliter: 'ml',
  milliliters: 'ml',
  ml: 'ml',
  package: 'package',
  packages: 'package',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  tbsp: 'tbsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  tsp: 'tsp',
}

/** Separate an accidentally copied source quantity without removing food descriptors. */
export function splitImportedIngredientName(value: string) {
  const name = value.trim()

  // Numbers can be part of a food's identity, rather than a recipe quantity.
  if (/^5[ -]spice\b/i.test(name)) {
    return {
      name,
      amount: null,
      unit: null,
    }
  }
  const match = name.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+[¼½¾⅓⅔⅛⅜⅝⅞]|[¼½¾⅓⅔⅛⅜⅝⅞]|\d+(?:[.,]\d+)?)\s+(?:x\s+)?(\S.*)$/i)

  if (!match) {
    return {
      name,
      amount: null,
      unit: null,
    }
  }
  const quantity = match[1]!
  let amount: number
  const fraction = quantity.at(-1)!

  if (fractions[fraction] !== undefined) {
    amount = Number(quantity.slice(0, -1) || 0) + fractions[fraction]!
  }
  else if (quantity.includes('/')) {
    const parts = quantity.split(/[\s/]+/).map(Number)

    amount = parts.length === 3 ? parts[0]! + parts[1]! / parts[2]! : parts[0]! / parts[1]!
  }
  else { amount = Number(quantity.replace(',', '.')) }
  if (!Number.isFinite(amount)) {
    return {
      name,
      amount: null,
      unit: null,
    }
  }
  const rest = match[2]!
  const unitMatch = rest.match(/^(\w+)\s+(?:of\s+)?(\S.*)$/i)
  const unit = unitMatch ? units[unitMatch[1]!.toLowerCase()] : undefined

  return {
    name: unit ? unitMatch![2]! : rest,
    amount,
    unit: unit || 'amount',
  }
}
