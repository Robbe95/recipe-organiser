import {
  useMutation,
  useQueryCache,
} from '@pinia/colada'

import { orpc } from '~/lib/orpc'

export function useImportRecipeFromImageMutation() {
  const queryCache = useQueryCache()

  return useMutation(orpc.recipes.importRecipeFromImage.mutationOptions({
    onSuccess: async () => {
      await queryCache.invalidateQueries({
        key: orpc.recipes.listRecipes.key(),
      })
    },
  }))
}
