import { useMutation } from '@pinia/colada'

import { orpc } from '~/lib/orpc'

export function useRemoveMealPlanItemMutation() {
  return useMutation(orpc.mealPlanner.removeMealPlanItem.mutationOptions())
}
