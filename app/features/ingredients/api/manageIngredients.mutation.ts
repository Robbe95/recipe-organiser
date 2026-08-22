import {
  useMutation,
  useQueryCache,
} from '@pinia/colada'

import { orpc } from '~/lib/orpc'

function invalidateIngredientLibrary() {
  const queryCache = useQueryCache()

  return () => queryCache.invalidateQueries({
    key: orpc.recipes.listRecipeFormData.key(),
  })
}

export function useLibraryIngredientMutations() {
  const onSuccess = invalidateIngredientLibrary()

  return {
    create: useMutation(orpc.recipes.createIngredient.mutationOptions({
      onSuccess,
    })),
    update: useMutation(orpc.recipes.updateIngredient.mutationOptions({
      onSuccess,
    })),
  }
}

export function useIngredientTypeMutations() {
  const onSuccess = invalidateIngredientLibrary()

  return {
    create: useMutation(orpc.recipes.createIngredientType.mutationOptions({
      onSuccess,
    })),
    update: useMutation(orpc.recipes.updateIngredientType.mutationOptions({
      onSuccess,
    })),
  }
}
