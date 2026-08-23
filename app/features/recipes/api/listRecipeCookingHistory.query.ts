import { useQuery } from '@pinia/colada'

import { orpc } from '~/lib/orpc'

export function useRecipeCookingHistoryQuery() {
  return useQuery(orpc.recipes.listRecipeCookingHistory.queryOptions({
    input: {},
  }))
}
