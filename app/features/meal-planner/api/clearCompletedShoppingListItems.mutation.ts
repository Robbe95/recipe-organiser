import {
  useMutation,
  useQueryCache,
} from '@pinia/colada'

import { orpc } from '~/lib/orpc'

import type { useShoppingListQuery } from './listShoppingList.query'

type ShoppingList = NonNullable<ReturnType<typeof useShoppingListQuery>['data']['value']>

export function useClearCompletedShoppingListItemsMutation() {
  const queryCache = useQueryCache()
  const key = orpc.mealPlanner.listShoppingList.key()
  let snapshot: ShoppingList | undefined

  return useMutation(orpc.mealPlanner.clearCompletedShoppingListItems.mutationOptions({
    onError: () => {
      if (snapshot) {
        queryCache.setQueryData<ShoppingList>(key, snapshot)
      }

      snapshot = undefined
    },
    onMutate: () => {
      snapshot = queryCache.getQueryData<ShoppingList>(key)

      queryCache.setQueryData<ShoppingList>(key, (items) => (items || []).filter((item) => !item.completedAt))
    },
    onSuccess: () => { snapshot = undefined },
  }))
}
