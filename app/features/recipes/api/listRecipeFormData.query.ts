import { useQuery } from '@pinia/colada'

import { orpc } from '~/lib/orpc'

export function useRecipeFormDataQuery() {
  return useQuery(orpc.recipes.listRecipeFormData.queryOptions({
    input: {},
  }))
}
