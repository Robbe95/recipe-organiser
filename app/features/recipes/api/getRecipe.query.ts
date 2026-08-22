import { useQuery } from '@pinia/colada'

import { orpc } from '~/lib/orpc'

export function useRecipeQuery(id: string) {
  return useQuery(orpc.recipes.getRecipe.queryOptions({
    input: {
      id,
    },
  }))
}
