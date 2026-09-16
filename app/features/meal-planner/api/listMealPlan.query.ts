import { useQuery } from '@pinia/colada'

import { orpc } from '~/lib/orpc'

export function useMealPlanQuery() {
  return useQuery(orpc.mealPlanner.listMealPlan.queryOptions())
}
