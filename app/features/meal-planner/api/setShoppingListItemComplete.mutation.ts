import {
  useMutation,
  useQueryCache,
} from '@pinia/colada'

import { orpc } from '~/lib/orpc'

import type { useShoppingListQuery } from './listShoppingList.query'

type ShoppingList = NonNullable<ReturnType<typeof useShoppingListQuery>['data']['value']>

export function useSetShoppingListItemCompleteMutation() {
  const queryCache = useQueryCache()
  const key = orpc.mealPlanner.listShoppingList.key()
  const snapshots = new Map<string, ShoppingList>()

  return useMutation(orpc.mealPlanner.setShoppingListItemComplete.mutationOptions({
    onError: (_error, input) => {
      const previous = snapshots.get(input.id)

      if (previous) {
        queryCache.setQueryData<ShoppingList>(key, previous)
      }

      snapshots.delete(input.id)
    },
    onMutate: (input) => {
      const previous = queryCache.getQueryData<ShoppingList>(key)

      if (previous) {
        snapshots.set(input.id, previous)
      }

      queryCache.setQueryData<ShoppingList>(key, (items) => (items || []).map((item) => item.id === input.id
        ? {
            ...item,
            completedAt: input.completed ? new Date() : null,
          }
        : item))
    },
    onSuccess: (updated) => {
      queryCache.setQueryData<ShoppingList>(key, (items) => (items || []).map((item) => item.id === updated.id
        ? updated
        : item))
      snapshots.delete(updated.id)
    },
  }))
}
