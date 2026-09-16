const storeOrder = new Map([
  [
    'vegetables & fruit',
    10,
  ],
  [
    'produce',
    10,
  ],
  [
    'bakery',
    20,
  ],
  [
    'grains, pasta & bread',
    20,
  ],
  [
    'protein',
    30,
  ],
  [
    'meat & fish',
    30,
  ],
  [
    'dairy & eggs',
    40,
  ],
  [
    'canned & jarred',
    50,
  ],
  [
    'sauces, oils & condiments',
    60,
  ],
  [
    'herbs & seasonings',
    70,
  ],
  [
    'baking',
    80,
  ],
  [
    'frozen',
    90,
  ],
  [
    'household',
    100,
  ],
  [
    'other',
    999,
  ],
])

function rankGroup(name: string) {
  return storeOrder.get(name.trim().toLowerCase()) ?? 500
}

export function compareShoppingGroups(left: string, right: string) {
  const difference = rankGroup(left) - rankGroup(right)

  return difference || left.localeCompare(right)
}
