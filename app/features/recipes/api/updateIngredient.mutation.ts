import {
  useMutation,
  useQueryCache,
} from '@pinia/colada'

import { orpc } from '~/lib/orpc'

export function useUpdateIngredientMutation() {
  const queryCache = useQueryCache()

  return useMutation(orpc.recipes.updateIngredient.mutationOptions({
    onSuccess: async () => {
      await queryCache.invalidateQueries({
        key: orpc.recipes.listRecipeFormData.key(),
      })
    },
  }))
}
