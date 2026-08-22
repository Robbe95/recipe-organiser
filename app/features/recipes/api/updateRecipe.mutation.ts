import {
  useMutation,
  useQueryCache,
} from '@pinia/colada'

import { orpc } from '~/lib/orpc'

export function useUpdateRecipeMutation() {
  const queryCache = useQueryCache()

  return useMutation(orpc.recipes.updateRecipe.mutationOptions({
    onSuccess: async () => {
      await queryCache.invalidateQueries({
        key: orpc.recipes.listRecipes.key(),
      })
    },
  }))
}
