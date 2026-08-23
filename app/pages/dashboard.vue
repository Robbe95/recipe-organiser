<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import type { DropdownMenuItem } from '@nuxt/ui'
import { useQueryCache } from '@pinia/colada'

import ConfirmDeleteModal from '~/components/ConfirmDeleteModal.vue'
import PageHeader from '~/components/page/PageHeader.vue'
import PageShell from '~/components/page/PageShell.vue'
import { useRecipesQuery } from '~/features/recipes/api/listRecipes.query'
import {
  useArchiveRecipeMutation,
  useDuplicateRecipeMutation,
  useRestoreRecipeMutation,
  useSetRecipeFavoriteMutation,
} from '~/features/recipes/api/recipeOrganization.mutations'
import RecipeEmptyState from '~/features/recipes/components/RecipeEmptyState.vue'
import RecipeImportModal from '~/features/recipes/components/RecipeImportModal.vue'
import { orpc } from '~/lib/orpc'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

const showArchived = ref(false)
const recipesQuery = useRecipesQuery(showArchived)
const recipes = computed(() => recipesQuery.data.value || [])
const search = ref('')
const selectedCuisine = ref<string | undefined>()
const selectedIngredients = ref<string[]>([])
const selectedTags = ref<string[]>([])
const favoritesOnly = ref(false)
const sort = ref<'calories' | 'cook-time' | 'newest' | 'recently-cooked'>('newest')
const archiveRecipeMutation = useArchiveRecipeMutation()
const duplicateRecipeMutation = useDuplicateRecipeMutation()
const setRecipeFavoriteMutation = useSetRecipeFavoriteMutation()
const restoreRecipeMutation = useRestoreRecipeMutation()
const overlay = useOverlay()
const confirmDeleteModal = overlay.create(ConfirmDeleteModal)
const recipeImportModal = overlay.create(RecipeImportModal)
const toast = useToast()
const queryCache = useQueryCache()
const cuisineOptions = computed(() => Array.from(new Set(recipes.value
  .map((recipe) => recipe.cuisine)
  .filter((cuisine): cuisine is string => Boolean(cuisine)))).sort())
const tagOptions = computed(() => Array.from(new Set(recipes.value
  .flatMap((recipe) => recipe.tags))).sort())
const ingredientOptions = computed(() => Array.from(new Set(recipes.value
  .flatMap((recipe) => recipe.ingredients))).sort())
const ingredientFilterOptions = computed(() => selectedFirstOptions(
  ingredientOptions.value,
  selectedIngredients.value,
  'All ingredients',
))
const tagFilterOptions = computed(() => selectedFirstOptions(
  tagOptions.value,
  selectedTags.value,
  'All tags',
))
const filteredRecipes = computed(() => {
  const searchTerm = search.value.trim().toLocaleLowerCase()

  return recipes.value.filter((recipe) => {
    const matchesSearch = !searchTerm || [
      recipe.name,
      recipe.description || '',
      recipe.cuisine || '',
      ...recipe.tags,
      ...recipe.ingredients,
    ].some((value) => value.toLocaleLowerCase().includes(searchTerm))
    const matchesCuisine = !selectedCuisine.value || recipe.cuisine === selectedCuisine.value
    const matchesIngredients = selectedIngredients.value.every((ingredient) => recipe.ingredients.includes(ingredient))
    const matchesTags = selectedTags.value.every((tag) => recipe.tags.includes(tag))

    return matchesSearch
      && matchesCuisine
      && matchesIngredients
      && matchesTags
      && (!favoritesOnly.value || recipe.isFavorite)
  }).sort((left, right) => {
    if (sort.value === 'calories') {
      return (left.calories ?? Number.MAX_SAFE_INTEGER) - (right.calories ?? Number.MAX_SAFE_INTEGER)
    }
    if (sort.value === 'cook-time') {
      return (left.cookTimeMinutes ?? Number.MAX_SAFE_INTEGER) - (right.cookTimeMinutes ?? Number.MAX_SAFE_INTEGER)
    }
    if (sort.value === 'recently-cooked') {
      return new Date(right.lastCookedAt || 0).getTime() - new Date(left.lastCookedAt || 0).getTime()
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  })
})
const hasFilters = computed(() => Boolean(
  search.value.trim()
  || selectedCuisine.value
  || selectedIngredients.value.length > 0
  || selectedTags.value.length > 0
  || favoritesOnly.value,
))

async function archiveRecipe(recipe: { id: string
  name: string }) {
  const confirmed = await confirmDeleteModal.open({
    title: 'Archive recipe?',
    description: `${recipe.name} will be hidden from your recipe library. You can restore it from archived recipes later.`,
  })

  if (confirmed) {
    await archiveRecipeMutation.mutateAsync({
      id: recipe.id,
    })
  }
}

async function duplicateRecipe(recipe: { id: string }) {
  const copy = await duplicateRecipeMutation.mutateAsync({
    id: recipe.id,
  })

  await navigateTo(`/recipes/${copy.id}/edit`)
}

async function restoreRecipe(recipe: { id: string }) {
  await restoreRecipeMutation.mutateAsync({
    id: recipe.id,
  })
}

async function importRecipe() {
  const jobId = await recipeImportModal.open()

  if (!jobId) {
    return
  }

  const importToast = toast.add({
    title: 'Importing recipe',
    close: false,
    description: 'This can take a moment. You can keep using the app.',
    duration: 0,
    icon: 'i-lucide-loader-circle',
    ui: {
      icon: 'animate-spin',
    },
  })
  const events = new EventSource(`/api/recipe-imports/${jobId}`)

  events.addEventListener('import', async (event) => {
    const result = JSON.parse((event as MessageEvent<string>).data) as {
      recipeId: string | null
      error: string | null
      recipeName: string | null
      status: string
    }

    if (result.status === 'review') {
      events.close()
      toast.update(importToast.id, {
        title: 'Import ready for review',
        actions: [
          {
            color: 'primary',
            label: 'Review import',
            onClick: () => navigateTo(`/recipes/imports/${jobId}`),
          },
        ],
        close: true,
        description: 'Review the extracted recipe before adding it to your library.',
        icon: 'i-lucide-clipboard-check',
        ui: {
          icon: '',
        },
      })
    }
    else if (result.status === 'completed' && result.recipeId && result.recipeName) {
      events.close()
      await Promise.all([
        recipesQuery.refetch(),
        queryCache.invalidateQueries({
          key: orpc.recipes.listRecipeFormData.key(),
        }),
      ])
      toast.update(importToast.id, {
        title: 'Recipe imported',
        actions: [
          {
            color: 'primary',
            label: `View ${result.recipeName}`,
            onClick: () => navigateTo(`/recipes/${result.recipeId}/edit`),
          },
        ],
        close: true,
        description: 'Your editable recipe draft is ready.',
        icon: 'i-lucide-sparkles',
        ui: {
          icon: '',
        },
      })
    }
    else if (result.status === 'failed') {
      events.close()
      toast.update(importToast.id, {
        title: 'Recipe import failed',
        close: true,
        color: 'error',
        description: result.error || 'We could not import that recipe.',
        icon: 'i-lucide-circle-alert',
        ui: {
          icon: '',
        },
      })
    }
  })

  events.addEventListener('error', () => {
    events.close()
  })
}

function clearFilters() {
  search.value = ''
  selectedCuisine.value = undefined
  selectedIngredients.value = []
  selectedTags.value = []
  favoritesOnly.value = false
}

function caloriesPerPortion(calories: number, portions: number) {
  return Math.round(calories / portions)
}

function recipeOverflowItems(recipe: {
  id: string
  isFavorite: boolean
  name: string
}): DropdownMenuItem[][] {
  return [
    [
      {
        icon: recipe.isFavorite ? 'i-lucide-heart-off' : 'i-lucide-heart',
        label: recipe.isFavorite ? 'Remove favorite' : 'Add favorite',
        onSelect: () => setRecipeFavoriteMutation.mutate({
          id: recipe.id,
          isFavorite: !recipe.isFavorite,
        }),
      },
      {
        icon: 'i-lucide-copy',
        label: 'Duplicate recipe',
        onSelect: () => duplicateRecipe(recipe),
      },
      {
        icon: 'i-lucide-archive',
        label: 'Archive recipe',
        onSelect: () => archiveRecipe(recipe),
      },
    ],
  ]
}

function selectedFirstOptions(items: string[], selected: string[], allLabel: string) {
  if (selected.length === 0) {
    return items
  }

  return [
    {
      label: 'Selected',
      type: 'label' as const,
    },
    ...selected,
    {
      type: 'separator' as const,
    },
    {
      label: allLabel,
      type: 'label' as const,
    },
    ...items.filter((item) => !selected.includes(item)),
  ]
}
</script>

<template>
  <PageShell>
    <PageHeader
      title="Recipes"
      description="A simple place for the recipes you make and return to."
    >
      <template #actions>
        <UButton
          :label="showArchived ? 'Active recipes' : 'Archived recipes'"
          icon="i-lucide-archive"
          color="neutral"
          variant="ghost"
          @click="showArchived = !showArchived"
        />
        <UButton
          label="Import recipe"
          icon="i-lucide-sparkles"
          color="neutral"
          variant="soft"
          @click="importRecipe"
        />
        <UButton
          label="New recipe"
          icon="i-lucide-plus"
          to="/recipes/new"
        />
      </template>
      <template #primary-action>
        <UButton
          label="New recipe"
          icon="i-lucide-plus"
          to="/recipes/new"
        />
      </template>
      <template #overflow-actions>
        <UButton
          :label="showArchived ? 'Active recipes' : 'Archived recipes'"
          icon="i-lucide-archive"
          color="neutral"
          variant="ghost"
          class="justify-start"
          block
          @click="showArchived = !showArchived"
        />
        <UButton
          label="Import recipe"
          icon="i-lucide-sparkles"
          color="neutral"
          variant="ghost"
          class="justify-start"
          block
          @click="importRecipe"
        />
      </template>
    </PageHeader>

    <RecipeEmptyState
      v-if="recipesQuery.isPending.value || recipes.length === 0"
      :loading="recipesQuery.isPending.value"
    />

    <div
      v-else
      class="flex flex-col gap-6"
    >
      <div
        class="
          grid gap-3 rounded-xl border border-default bg-elevated/30 p-3
          md:grid-cols-[minmax(0,1fr)_11rem_13rem_13rem]
        "
      >
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Search recipes, ingredients, cuisines, or tags"
          size="lg"
        />
        <USelectMenu
          v-model="selectedCuisine"
          :items="cuisineOptions"
          class="w-full"
          icon="i-lucide-map-pin"
          placeholder="All cuisines"
          clear
        />
        <USelectMenu
          v-model="selectedIngredients"
          :items="ingredientFilterOptions"
          class="w-full"
          icon="i-lucide-carrot"
          placeholder="Any ingredients"
          multiple
        />
        <USelectMenu
          v-model="selectedTags"
          :items="tagFilterOptions"
          class="w-full"
          icon="i-lucide-tags"
          placeholder="All tags"
          multiple
        />
        <div
          class="
            flex flex-wrap items-center gap-2
            md:col-span-4
          "
        >
          <UButton
            :color="favoritesOnly ? 'primary' : 'neutral'"
            :variant="favoritesOnly ? 'soft' : 'outline'"
            icon="i-lucide-heart"
            label="Favorites"
            @click="favoritesOnly = !favoritesOnly"
          />
          <USelectMenu
            v-model="sort"
            :items="[
              { label: 'Newest',
                value: 'newest' },
              { label: 'Recently cooked',
                value: 'recently-cooked' },
              { label: 'Calories',
                value: 'calories' },
              { label: 'Cook time',
                value: 'cook-time' },
            ]"
            value-key="value"
            class="w-44 max-w-full"
            placeholder="Sort recipes"
          />
          <UButton
            :class="hasFilters ? '' : 'invisible'"
            :disabled="!hasFilters"
            label="Clear"
            color="neutral"
            variant="ghost"
            @click="clearFilters"
          />
        </div>
      </div>

      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-highlighted">
          {{ filteredRecipes.length }} {{ filteredRecipes.length === 1 ? 'recipe' : 'recipes' }}
        </h2>
        <span
          v-if="hasFilters"
          class="text-sm text-toned"
        >Filtered from {{ recipes.length }}</span>
      </div>

      <UEmpty
        v-if="filteredRecipes.length === 0"
        icon="i-lucide-search-x"
        title="No recipes found"
        description="Try another search or clear your filters."
      >
        <template #actions>
          <UButton
            label="Clear filters"
            color="neutral"
            variant="soft"
            @click="clearFilters"
          />
        </template>
      </UEmpty>

      <div
        v-else
        class="flex flex-col gap-1"
      >
        <article
          v-for="recipe in filteredRecipes"
          :key="recipe.id"
          class="
            group flex items-center rounded-xl border border-transparent
            transition-colors
            hover:border-default hover:bg-elevated/60
          "
        >
          <NuxtLink
            :to="`/recipes/${recipe.id}/edit`"
            class="
              flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5
              sm:gap-4 sm:px-4 sm:py-3
            "
          >
            <img
              v-if="recipe.image"
              :src="recipe.image.url"
              :alt="recipe.name"
              class="
                size-16 shrink-0 rounded-md object-cover transition-transform
                duration-200
                group-hover:scale-[1.02]
                sm:size-18
              "
            >
            <div
              v-else
              class="
                flex size-16 shrink-0 items-center justify-center rounded-md
                bg-elevated text-primary
                sm:size-18
              "
            >
              <UIcon
                name="i-lucide-chef-hat"
                class="size-6"
              />
            </div>
            <div class="flex min-w-0 flex-1 flex-col gap-1">
              <div class="flex min-w-0 items-center gap-2">
                <h3 class="truncate font-semibold text-highlighted">
                  {{ recipe.name }}
                </h3>
                <span
                  v-if="recipe.calories !== null"
                  class="shrink-0 text-xs text-toned"
                >{{ caloriesPerPortion(recipe.calories, recipe.defaultPortions) }} kcal / portion</span>
              </div>
              <p
                v-if="recipe.description"
                class="line-clamp-1 text-sm text-toned"
              >
                {{ recipe.description }}
              </p>
              <div
                v-if="recipe.cuisine || recipe.tags.length > 0"
                class="flex items-center gap-1.5 text-xs text-toned"
              >
                <UBadge
                  v-if="recipe.cuisine"
                  color="primary"
                  variant="subtle"
                  size="sm"
                >
                  {{ recipe.cuisine }}
                </UBadge>
                <span v-if="recipe.cuisine && recipe.tags.length > 0">·</span>
                <span
                  v-if="recipe.tags.length > 0"
                  class="truncate"
                >{{ recipe.tags.slice(0, 2).join(' · ') }}{{ recipe.tags.length > 2 ? ` · +${recipe.tags.length - 2}` : '' }}</span>
              </div>
            </div>
          </NuxtLink>
          <div
            class="
              flex shrink-0 items-center pr-2
              sm:hidden
            "
          >
            <UButton
              v-if="showArchived"
              icon="i-lucide-archive-restore"
              color="primary"
              variant="ghost"
              size="sm"
              aria-label="Restore recipe"
              @click="restoreRecipe(recipe)"
            />
            <template v-else>
              <UButton
                :to="`/recipes/${recipe.id}/edit`"
                icon="i-lucide-pencil"
                color="neutral"
                variant="ghost"
                size="sm"
                aria-label="Edit recipe"
              />
              <UDropdownMenu :items="recipeOverflowItems(recipe)">
                <UButton
                  icon="i-lucide-ellipsis-vertical"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  aria-label="More recipe actions"
                />
              </UDropdownMenu>
            </template>
          </div>
          <div
            class="
              hidden shrink-0 items-center gap-0.5 pr-3 opacity-0
              transition-opacity
              group-focus-within:opacity-100
              group-hover:opacity-100
              sm:flex
            "
          >
            <UButton
              v-if="showArchived"
              icon="i-lucide-archive-restore"
              color="primary"
              variant="ghost"
              size="sm"
              aria-label="Restore recipe"
              @click="restoreRecipe(recipe)"
            />
            <template v-else>
              <UButton
                :icon="recipe.isFavorite ? 'i-lucide-heart-off' : 'i-lucide-heart'"
                :color="recipe.isFavorite ? 'primary' : 'neutral'"
                :aria-label="recipe.isFavorite ? 'Remove favorite' : 'Add favorite'"
                variant="ghost"
                size="sm"
                @click="setRecipeFavoriteMutation.mutate({ id: recipe.id,
                                                           isFavorite: !recipe.isFavorite })"
              />
              <UButton
                :to="`/recipes/${recipe.id}/edit`"
                icon="i-lucide-pencil"
                color="neutral"
                variant="ghost"
                size="sm"
                aria-label="Edit recipe"
              />
              <UButton
                icon="i-lucide-copy"
                color="neutral"
                variant="ghost"
                size="sm"
                aria-label="Duplicate recipe"
                @click="duplicateRecipe(recipe)"
              />
              <UButton
                icon="i-lucide-archive"
                color="neutral"
                variant="ghost"
                size="sm"
                aria-label="Archive recipe"
                @click="archiveRecipe(recipe)"
              />
            </template>
          </div>
        </article>
      </div>
    </div>
  </PageShell>
</template>
