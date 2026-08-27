import {
  useMutation,
  useQueryCache,
} from '@pinia/colada'

import { orpc } from '~/lib/orpc'

export function useCreateIngredientVariantMutation() {
  const queryCache = useQueryCache()

  return useMutation(orpc.recipes.createIngredientVariant.mutationOptions({
    onSuccess: async () => {
      await queryCache.invalidateQueries({
        key: orpc.recipes.listRecipeFormData.key(),
      })
    },
  }))
}
