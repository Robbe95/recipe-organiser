import {
  useMutation,
  useQueryCache,
} from '@pinia/colada'

import { orpc } from '~/lib/orpc'

export function useCreateIngredientMutation() {
  const queryCache = useQueryCache()

  return useMutation(orpc.recipes.createIngredient.mutationOptions({
    onSuccess: async () => {
      await queryCache.invalidateQueries({
        key: orpc.recipes.listRecipeFormData.key(),
      })
    },
  }))
}
