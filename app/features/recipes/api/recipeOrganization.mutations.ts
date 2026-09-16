import {
  useMutation,
  useQueryCache,
} from '@pinia/colada'

import { orpc } from '~/lib/orpc'

import type { useRecipesQuery } from './listRecipes.query'

type RecipeList = NonNullable<ReturnType<typeof useRecipesQuery>['data']['value']>

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
  const queryCache = useQueryCache()
  const key = orpc.recipes.listRecipes.key()
  const snapshots = new Map<string, RecipeList>()

  return useMutation(orpc.recipes.setRecipeFavorite.mutationOptions({
    onError: (_error, input) => {
      const previous = snapshots.get(input.id)

      if (previous) {
        queryCache.setQueryData<RecipeList>(key, previous)
      }

      snapshots.delete(input.id)
    },
    onMutate: (input) => {
      const previous = queryCache.getQueryData<RecipeList>(key)

      if (previous) {
        snapshots.set(input.id, previous)
      }

      queryCache.setQueryData<RecipeList>(key, (recipes) => (recipes || []).map((recipe) => recipe.id === input.id
        ? {
            ...recipe,
            isFavorite: input.isFavorite,
          }
        : recipe))
    },
    onSuccess: (updated) => {
      queryCache.setQueryData<RecipeList>(key, (recipes) => (recipes || []).map((recipe) => recipe.id === updated.id
        ? {
            ...recipe,
            isFavorite: updated.isFavorite,
          }
        : recipe))
      snapshots.delete(updated.id)
    },
  }))
}
