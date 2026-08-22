import { useMutation } from '@pinia/colada'

import { orpc } from '~/lib/orpc'

export function useCreateRecipeMutation() {
  return useMutation(orpc.recipes.createRecipe.mutationOptions())
}
