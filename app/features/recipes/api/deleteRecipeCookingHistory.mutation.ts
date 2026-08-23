import {
  useMutation,
  useQueryCache,
} from '@pinia/colada'

import { orpc } from '~/lib/orpc'

export function useDeleteRecipeCookingHistoryMutation() {
  const queryCache = useQueryCache()

  return useMutation(orpc.recipes.deleteRecipeCookingHistory.mutationOptions({
    onSuccess: async () => {
      await queryCache.invalidateQueries({
        key: orpc.recipes.listRecipeCookingHistory.key(),
      })
    },
  }))
}
