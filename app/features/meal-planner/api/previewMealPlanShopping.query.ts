import { useQuery } from '@pinia/colada'
import type { MaybeRefOrGetter } from 'vue'
import {
  computed,
  toValue,
} from 'vue'

import { orpc } from '~/lib/orpc'

export function useMealPlanShoppingPreviewQuery(selections: MaybeRefOrGetter<Array<{
  recipeId: string
  portions: number
}>>) {
  return useQuery(orpc.mealPlanner.previewMealPlanShopping.queryOptions({
    input: computed(() => ({
      selections: toValue(selections),
    })),
  }))
}
