import { useMutation } from '@pinia/colada'

import { orpc } from '~/lib/orpc'

export function useAddShoppingListItemMutation() {
  return useMutation(orpc.mealPlanner.addShoppingListItem.mutationOptions())
}
