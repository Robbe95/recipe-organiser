import { useQuery } from '@pinia/colada'

import { orpc } from '~/lib/orpc'

export function useRecipeImportQuery(id: string) {
  return useQuery(orpc.recipes.getRecipeImport.queryOptions({
    input: {
      id,
    },
  }))
}
