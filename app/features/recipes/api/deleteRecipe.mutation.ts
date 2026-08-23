import {
  useMutation,
  useQueryCache,
} from '@pinia/colada'

import { orpc } from '~/lib/orpc'

export function useDeleteRecipeMutation() {
  const queryCache = useQueryCache()

  return useMutation(orpc.recipes.deleteRecipe.mutationOptions({
    onSuccess: async () => {
      await queryCache.invalidateQueries({
        key: orpc.recipes.listRecipes.key(),
      })
    },
  }))
}
