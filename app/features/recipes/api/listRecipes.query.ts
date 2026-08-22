import { useQuery } from '@pinia/colada'

import { orpc } from '~/lib/orpc'

export function useRecipesQuery() {
  return useQuery(orpc.recipes.listRecipes.queryOptions({
    input: {},
  }))
}
