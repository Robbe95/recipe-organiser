import {
  useMutation,
  useQueryCache,
} from '@pinia/colada'

import { orpc } from '~/lib/orpc'

export function useCompleteRecipeCookingMutation() {
  const queryCache = useQueryCache()

  return useMutation(orpc.recipes.completeRecipeCooking.mutationOptions({
    onSuccess: async () => {
      await queryCache.invalidateQueries({
        key: orpc.mealPlanner.listMealPlan.key(),
      })
    },
  }))
}
