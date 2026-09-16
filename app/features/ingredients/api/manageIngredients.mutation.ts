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
  const toast = useToast()

  function onError(error: Error) {
    toast.add({
      title: 'Could not save ingredient',
      color: 'error',
      description: error.message,
    })
  }

  return {
    create: useMutation(orpc.recipes.createIngredient.mutationOptions({
      onError,
      onSuccess,
    })),
    delete: useMutation(orpc.recipes.deleteIngredient.mutationOptions({
      onSuccess,
    })),
    deleteMany: useMutation(orpc.recipes.deleteIngredients.mutationOptions({
      onSuccess,
    })),
    update: useMutation(orpc.recipes.updateIngredient.mutationOptions({
      onError,
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
    delete: useMutation(orpc.recipes.deleteIngredientType.mutationOptions({
      onSuccess,
    })),
    update: useMutation(orpc.recipes.updateIngredientType.mutationOptions({
      onSuccess,
    })),
  }
}
