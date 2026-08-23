import { useMutation } from '@pinia/colada'

import { orpc } from '~/lib/orpc'

export function useCompleteRecipeCookingMutation() {
  return useMutation(orpc.recipes.completeRecipeCooking.mutationOptions())
}
