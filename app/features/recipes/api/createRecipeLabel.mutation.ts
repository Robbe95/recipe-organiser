import {
  useMutation,
  useQueryCache,
} from '@pinia/colada'

import { orpc } from '~/lib/orpc'

export function useCreateRecipeLabelMutation() {
  const queryCache = useQueryCache()

  return useMutation(orpc.recipes.createRecipeLabel.mutationOptions({
    onSuccess: async () => {
      await queryCache.invalidateQueries({
        key: orpc.recipes.listRecipeFormData.key(),
      })
    },
  }))
}
