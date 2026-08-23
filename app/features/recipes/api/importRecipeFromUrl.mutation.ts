import {
  useMutation,
  useQueryCache,
} from '@pinia/colada'

import { orpc } from '~/lib/orpc'

export function useImportRecipeFromUrlMutation() {
  const queryCache = useQueryCache()

  return useMutation(orpc.recipes.importRecipeFromUrl.mutationOptions({
    onSuccess: async () => {
      await queryCache.invalidateQueries({
        key: orpc.recipes.listRecipes.key(),
      })
    },
  }))
}
