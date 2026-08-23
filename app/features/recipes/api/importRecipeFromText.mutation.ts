import {
  useMutation,
  useQueryCache,
} from '@pinia/colada'

import { orpc } from '~/lib/orpc'

export function useImportRecipeFromTextMutation() {
  const queryCache = useQueryCache()

  return useMutation(orpc.recipes.importRecipeFromText.mutationOptions({
    onSuccess: async () => {
      await queryCache.invalidateQueries({
        key: orpc.recipes.listRecipes.key(),
      })
    },
  }))
}
