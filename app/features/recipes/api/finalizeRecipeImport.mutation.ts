import { useMutation } from '@pinia/colada'

import { orpc } from '~/lib/orpc'

export function useFinalizeRecipeImportMutation() {
  return useMutation(orpc.recipes.finalizeRecipeImport.mutationOptions())
}
