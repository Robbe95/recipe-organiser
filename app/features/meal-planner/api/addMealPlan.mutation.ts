import { useMutation } from '@pinia/colada'

import { orpc } from '~/lib/orpc'

export function useAddMealPlanMutation() {
  return useMutation(orpc.mealPlanner.addMealPlan.mutationOptions())
}
