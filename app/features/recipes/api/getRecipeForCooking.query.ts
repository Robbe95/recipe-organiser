import { useQuery } from '@pinia/colada'

import { orpc } from '~/lib/orpc'

export function useRecipeForCookingQuery(id: string) {
  return useQuery(orpc.recipes.getRecipeForCooking.queryOptions({
    input: {
      id,
    },
  }))
}
