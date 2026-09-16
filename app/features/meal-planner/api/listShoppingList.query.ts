import { useQuery } from '@pinia/colada'

import { orpc } from '~/lib/orpc'

export function useShoppingListQuery() {
  return useQuery(orpc.mealPlanner.listShoppingList.queryOptions())
}
