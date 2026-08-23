<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import ConfirmDeleteModal from '~/components/ConfirmDeleteModal.vue'
import PageHeader from '~/components/page/PageHeader.vue'
import PageShell from '~/components/page/PageShell.vue'
import { useDeleteRecipeMutation } from '~/features/recipes/api/deleteRecipe.mutation'
import { useRecipesQuery } from '~/features/recipes/api/listRecipes.query'
import RecipeEmptyState from '~/features/recipes/components/RecipeEmptyState.vue'
import RecipeImportModal from '~/features/recipes/components/RecipeImportModal.vue'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

const recipesQuery = useRecipesQuery()
const recipes = computed(() => recipesQuery.data.value || [])
const search = ref('')
const selectedCuisine = ref<string | undefined>()
const selectedIngredients = ref<string[]>([])
const selectedTags = ref<string[]>([])
const deleteRecipeMutation = useDeleteRecipeMutation()
const overlay = useOverlay()
const confirmDeleteModal = overlay.create(ConfirmDeleteModal)
const recipeImportModal = overlay.create(RecipeImportModal)
const toast = useToast()
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

    return matchesSearch && matchesCuisine && matchesIngredients && matchesTags
  })
})
const hasFilters = computed(() => Boolean(
  search.value.trim()
  || selectedCuisine.value
  || selectedIngredients.value.length > 0
  || selectedTags.value.length > 0,
))

async function deleteRecipe(recipe: { id: string
  name: string }) {
  const confirmed = await confirmDeleteModal.open({
    title: 'Delete recipe?',
    description: `Delete ${recipe.name} and all of its steps? This cannot be undone.`,
  })

  if (!confirmed) {
    return
  }

  await deleteRecipeMutation.mutateAsync({
    id: recipe.id,
  })
}

async function importRecipe() {
  const recipeId = await recipeImportModal.open()

  if (!recipeId) {
    return
  }

  toast.add({
    title: 'Recipe imported',
    description: 'Review the draft and make any final edits.',
    icon: 'i-lucide-sparkles',
  })
  await navigateTo(`/recipes/${recipeId}/edit`)
}

function clearFilters() {
  search.value = ''
  selectedCuisine.value = undefined
  selectedIngredients.value = []
  selectedTags.value = []
}

function caloriesPerPortion(calories: number, portions: number) {
  return Math.round(calories / portions)
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
          md:grid-cols-[minmax(0,1fr)_11rem_13rem_13rem_auto]
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
        <UButton
          :class="hasFilters ? '' : 'invisible'"
          :disabled="!hasFilters"
          label="Clear"
          color="neutral"
          variant="ghost"
          @click="clearFilters"
        />
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
              flex shrink-0 items-center gap-0.5 pr-2 opacity-100
              sm:pr-3 sm:opacity-0 sm:transition-opacity
              sm:group-focus-within:opacity-100
              sm:group-hover:opacity-100
            "
          >
            <UButton
              :to="`/recipes/${recipe.id}/edit`"
              icon="i-lucide-pencil"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="Edit recipe"
            />
            <UButton
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              size="sm"
              aria-label="Delete recipe"
              @click="deleteRecipe(recipe)"
            />
          </div>
        </article>
      </div>
    </div>
  </PageShell>
</template>
