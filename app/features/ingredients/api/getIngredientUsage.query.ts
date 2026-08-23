import { useQuery } from '@pinia/colada'
import type { MaybeRefOrGetter } from 'vue'
import {
  computed,
  toValue,
} from 'vue'

import { orpc } from '~/lib/orpc'

export function useIngredientUsageQuery(id: MaybeRefOrGetter<string | null>) {
  return useQuery(orpc.recipes.getIngredientUsage.queryOptions({
    enabled: computed(() => Boolean(toValue(id))),
    input: computed(() => ({
      id: toValue(id) || '',
    })),
  }))
}
