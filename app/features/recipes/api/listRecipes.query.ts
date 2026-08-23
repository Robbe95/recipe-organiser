import { useQuery } from '@pinia/colada'
import type { MaybeRefOrGetter } from 'vue'
import {
  computed,
  toValue,
} from 'vue'

import { orpc } from '~/lib/orpc'

export function useRecipesQuery(archived?: MaybeRefOrGetter<boolean>) {
  return useQuery(orpc.recipes.listRecipes.queryOptions({
    input: computed(() => ({
      archived: archived === undefined ? undefined : toValue(archived),
    })),
  }))
}
