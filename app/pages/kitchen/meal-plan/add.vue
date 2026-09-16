<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import { useAddMealPlanMutation } from '~/features/meal-planner/api/addMealPlan.mutation'
import { useMealPlanShoppingPreviewQuery } from '~/features/meal-planner/api/previewMealPlanShopping.query'
import { useRecipesQuery } from '~/features/recipes/api/listRecipes.query'

definePageMeta({
  layout: 'kitchen',
  middleware: 'auth',
  viewTransition: true,
})

const route = useRoute()
const router = useRouter()
const recipesQuery = useRecipesQuery()
const selectedRecipeIds = computed(() => String(route.query.recipes || '')
  .split(',')
  .filter(Boolean))
const plannedSelections = ref<Array<{
  recipeId: string
  portions: number
}>>([])
const recipesById = computed(() => new Map((recipesQuery.data.value || []).map((recipe) => [
  recipe.id,
  recipe,
])))
const selections = computed(() => plannedSelections.value.filter((selection) => recipesById.value.has(
  selection.recipeId,
)))

watch([
  selectedRecipeIds,
  recipesById,
], () => {
  const existingPortions = new Map(plannedSelections.value.map((selection) => [
    selection.recipeId,
    selection.portions,
  ]))

  plannedSelections.value = selectedRecipeIds.value.flatMap((recipeId) => {
    const recipe = recipesById.value.get(recipeId)

    return recipe
      ? [
          {
            recipeId,
            portions: existingPortions.get(recipeId) || 2,
          },
        ]
      : []
  })
}, {
  immediate: true,
})

function changePortions(recipeId: string, direction: -1 | 1) {
  plannedSelections.value = plannedSelections.value.map((selection) => selection.recipeId === recipeId
    ? {
        ...selection,
        portions: Math.max(1, selection.portions + direction),
      }
    : selection)
}

const selectedRecipes = computed(() => selections.value.flatMap((selection) => {
  const recipe = recipesById.value.get(selection.recipeId)

  return recipe
    ? [
        {
          ...selection,
          name: recipe.name,
        },
      ]
    : []
}))

const previewQuery = useMealPlanShoppingPreviewQuery(selections)

type PreviewItems = NonNullable<typeof previewQuery.data.value>

const previewItems = ref<PreviewItems>([])
const includedRecipeIngredientIds = ref<string[]>([])
const hasInitialisedSelection = ref(false)
const addMealPlanMutation = useAddMealPlanMutation()

watch(() => previewQuery.data.value, (items) => {
  if (!items) {
    return
  }

  previewItems.value = items

  if (hasInitialisedSelection.value) {
    return
  }

  includedRecipeIngredientIds.value = items
    .filter((item) => !item.isOptional && !item.isPantryStaple)
    .map((item) => item.recipeIngredientId)
  hasInitialisedSelection.value = true
}, {
  immediate: true,
})

const isRefreshingPreview = computed(() => previewQuery.isPending.value && previewItems.value.length > 0)

function isIncluded(recipeIngredientId: string) {
  return includedRecipeIngredientIds.value.includes(recipeIngredientId)
}

function toggleIngredient(recipeIngredientId: string) {
  includedRecipeIngredientIds.value = isIncluded(recipeIngredientId)
    ? includedRecipeIngredientIds.value.filter((id) => id !== recipeIngredientId)
    : [
        ...includedRecipeIngredientIds.value,
        recipeIngredientId,
      ]
}

async function addMealPlan() {
  if (selections.value.length === 0) {
    await router.replace('/kitchen')

    return
  }

  await addMealPlanMutation.mutateAsync({
    includedRecipeIngredientIds: includedRecipeIngredientIds.value,
    selections: selections.value,
  })
  await router.replace('/kitchen/meal-plan')
}
</script>

<template>
  <div
    class="
      mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6
      sm:px-6
    "
  >
    <div class="flex flex-col gap-2">
      <p class="text-sm font-medium text-primary">
        One last check
      </p>
      <h1 class="text-3xl font-semibold tracking-tight text-highlighted">
        Add ingredients to shopping list
      </h1>
      <p class="text-muted">
        Untick anything you already have at home.
      </p>
    </div>

    <UEmpty
      v-if="selections.length === 0"
      :actions="[{ label: 'Choose recipes',
                   to: '/kitchen' }]"
      icon="i-lucide-arrow-left"
      title="Choose at least one recipe"
      description="Go back to Recipes to start your meal plan."
    />
    <div
      v-else
      class="flex flex-col gap-3"
    >
      <section class="flex flex-col gap-2">
        <h2 class="text-sm font-semibold text-muted">
          Portions
        </h2>
        <UPageCard
          v-for="selection in selectedRecipes"
          :key="selection.recipeId"
        >
          <div class="flex items-center justify-between gap-3">
            <span class="min-w-0 truncate font-medium text-highlighted">{{ selection.name }}</span>
            <div class="flex shrink-0 items-center gap-2">
              <UButton
                :disabled="selection.portions === 1"
                :aria-label="`Decrease ${selection.name} portions`"
                color="neutral"
                icon="i-lucide-minus"
                size="xs"
                variant="ghost"
                @click="changePortions(selection.recipeId, -1)"
              />
              <span
                class="w-16 text-center text-sm font-semibold text-highlighted"
              >{{ selection.portions }} people</span>
              <UButton
                :aria-label="`Increase ${selection.name} portions`"
                color="neutral"
                icon="i-lucide-plus"
                size="xs"
                variant="ghost"
                @click="changePortions(selection.recipeId, 1)"
              />
            </div>
          </div>
        </UPageCard>
      </section>
      <div class="flex h-5 items-center gap-2">
        <h2 class="text-sm font-semibold text-muted">
          Ingredients
        </h2>
        <span
          v-if="isRefreshingPreview"
          aria-label="Updating ingredient amounts"
          class="flex items-center gap-1.5 text-xs text-muted"
          role="status"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-3.5 animate-spin text-primary"
          />
          Updating
        </span>
      </div>
      <KitchenLoading
        v-if="previewQuery.isPending.value && previewItems.length === 0"
        label="Gathering ingredients"
      />
      <UPageCard
        v-for="item in previewItems"
        :key="item.recipeIngredientId"
        class="cursor-pointer"
        @click="toggleIngredient(item.recipeIngredientId)"
      >
        <div class="flex items-center gap-3">
          <UIcon
            :name="isIncluded(item.recipeIngredientId) ? 'i-lucide-circle-check' : 'i-lucide-circle'"
            class="size-5 shrink-0 text-primary"
          />
          <div class="min-w-0 flex-1">
            <p class="font-medium text-highlighted">
              {{ item.name }}
            </p>
            <p class="text-sm text-muted">
              {{ item.recipeName }}
              <span v-if="item.isPantryStaple"> · pantry staple</span>
              <span v-else-if="item.isOptional"> · optional</span>
            </p>
          </div>
          <span
            v-if="item.amount !== null"
            class="shrink-0 text-sm text-muted"
          >{{ item.amount }} {{ item.unit }}</span>
        </div>
      </UPageCard>
      <UButton
        :loading="addMealPlanMutation.isLoading.value"
        icon="i-lucide-shopping-basket"
        label="Add meal plan"
        size="xl"
        @click="addMealPlan"
      />
    </div>
  </div>
</template>
