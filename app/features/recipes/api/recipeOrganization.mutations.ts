import {
  useMutation,
  useQueryCache,
} from '@pinia/colada'

import { orpc } from '~/lib/orpc'

function invalidateRecipes() {
  const queryCache = useQueryCache()

  return async () => {
    await queryCache.invalidateQueries({
      key: orpc.recipes.listRecipes.key(),
    })
  }
}

export function useArchiveRecipeMutation() {
  const onSuccess = invalidateRecipes()

  return useMutation(orpc.recipes.archiveRecipe.mutationOptions({
    onSuccess,
  }))
}

export function useRestoreRecipeMutation() {
  const onSuccess = invalidateRecipes()

  return useMutation(orpc.recipes.restoreRecipe.mutationOptions({
    onSuccess,
  }))
}

export function useDuplicateRecipeMutation() {
  const onSuccess = invalidateRecipes()

  return useMutation(orpc.recipes.duplicateRecipe.mutationOptions({
    onSuccess,
  }))
}

export function useSetRecipeFavoriteMutation() {
  const onSuccess = invalidateRecipes()

  return useMutation(orpc.recipes.setRecipeFavorite.mutationOptions({
    onSuccess,
  }))
}
