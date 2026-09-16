<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import PageHeader from '~/components/page/PageHeader.vue'
import PageShell from '~/components/page/PageShell.vue'
import { useAddMealPlanMutation } from '~/features/meal-planner/api/addMealPlan.mutation'
import { useMealPlanShoppingPreviewQuery } from '~/features/meal-planner/api/previewMealPlanShopping.query'
import { useRecipesQuery } from '~/features/recipes/api/listRecipes.query'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

const router = useRouter()
const toast = useToast()
const recipesQuery = useRecipesQuery()
const step = ref<'review' | 'select'>('select')
const selectedRecipeIds = ref<string[]>([])
const portionsByRecipeId = ref<Record<string, number>>({})
const includedRecipeIngredientIds = ref<string[]>([])
const hasInitialisedIngredients = ref(false)
const addMealPlanMutation = useAddMealPlanMutation()
const recipes = computed(() => recipesQuery.data.value || [])
const selections = computed(() => selectedRecipeIds.value.flatMap((recipeId) => {
  const recipe = recipes.value.find((item) => item.id === recipeId)

  return recipe
    ? [
        {
          recipeId,
          portions: portionsByRecipeId.value[recipeId] || 2,
        },
      ]
    : []
}))
const selectedRecipes = computed(() => selections.value.flatMap((selection) => {
  const recipe = recipes.value.find((item) => item.id === selection.recipeId)

  return recipe
    ? [
        {
          ...selection,
          recipe,
        },
      ]
    : []
}))
const previewQuery = useMealPlanShoppingPreviewQuery(selections)

watch([
  step,
  () => previewQuery.data.value,
], ([
  currentStep,
  items,
]) => {
  if (currentStep !== 'review') {
    hasInitialisedIngredients.value = false

    return
  }

  if (!items || items.length === 0 || hasInitialisedIngredients.value) {
    return
  }

  includedRecipeIngredientIds.value = items
    .filter((item) => !item.isOptional && !item.isPantryStaple)
    .map((item) => item.recipeIngredientId)
  hasInitialisedIngredients.value = true
}, {
  immediate: true,
})

function toggleRecipe(recipeId: string) {
  if (selectedRecipeIds.value.includes(recipeId)) {
    selectedRecipeIds.value = selectedRecipeIds.value.filter((id) => id !== recipeId)

    return
  }

  portionsByRecipeId.value[recipeId] ||= 2
  selectedRecipeIds.value = [
    ...selectedRecipeIds.value,
    recipeId,
  ]
}

function changePortions(recipeId: string, direction: -1 | 1) {
  portionsByRecipeId.value[recipeId] = Math.max(1, (portionsByRecipeId.value[recipeId] || 1) + direction)
}

function toggleIngredient(recipeIngredientId: string) {
  includedRecipeIngredientIds.value = includedRecipeIngredientIds.value.includes(recipeIngredientId)
    ? includedRecipeIngredientIds.value.filter((id) => id !== recipeIngredientId)
    : [
        ...includedRecipeIngredientIds.value,
        recipeIngredientId,
      ]
}

async function saveMealPlan() {
  try {
    await addMealPlanMutation.mutateAsync({
      includedRecipeIngredientIds: includedRecipeIngredientIds.value,
      selections: selections.value,
    })
    await router.push('/meal-plan')
  }
  catch {
    toast.add({
      title: 'Could not create meal plan',
      color: 'error',
      description: 'Your meal plan could not be saved. Please try again.',
    })
  }
}
</script>

<template>
  <PageShell>
    <PageHeader
      :breadcrumbs="[{ label: 'Meal plan',
                       to: '/meal-plan' }]"
      :description="step === 'select'
        ? 'Choose the recipes you want to cook next.'
        : 'Review portions and decide what should go on the shopping list.'"
      :title="step === 'select' ? 'Create meal plan' : 'Review your plan'"
    >
      <template #actions>
        <UButton
          v-if="step === 'review'"
          color="neutral"
          icon="i-lucide-arrow-left"
          label="Back to recipes"
          variant="ghost"
          @click="step = 'select'"
        />
        <UButton
          v-else
          :disabled="selections.length === 0"
          icon="i-lucide-arrow-right"
          label="Review ingredients"
          @click="step = 'review'"
        />
      </template>
      <template #primary-action>
        <UButton
          v-if="step === 'review'"
          color="neutral"
          icon="i-lucide-arrow-left"
          variant="ghost"
          aria-label="Back to recipes"
          @click="step = 'select'"
        />
        <UButton
          v-else
          :disabled="selections.length === 0"
          icon="i-lucide-arrow-right"
          aria-label="Review ingredients"
          @click="step = 'review'"
        />
      </template>
    </PageHeader>

    <div
      v-if="step === 'select'"
      class="flex flex-col gap-5"
    >
      <div class="flex items-center justify-between gap-3">
        <p class="text-sm text-muted">
          {{ selectedRecipeIds.length }} selected
        </p>
        <UButton
          :disabled="selections.length === 0"
          icon="i-lucide-arrow-right"
          label="Review ingredients"
          @click="step = 'review'"
        />
      </div>
      <KitchenLoading
        v-if="recipesQuery.isPending.value"
        label="Gathering your recipes"
      />
      <UEmpty
        v-else-if="recipes.length === 0"
        icon="i-lucide-cooking-pot"
        title="No recipes yet"
        description="Add a recipe first, then come back to plan meals."
      />
      <div
        v-else
        class="
          grid gap-3
          md:grid-cols-2
          xl:grid-cols-3
        "
      >
        <button
          v-for="recipe in recipes"
          :key="recipe.id"
          :class="selectedRecipeIds.includes(recipe.id) ? `
            border-primary bg-primary/5 ring-1 ring-primary
          ` : `
            border-default bg-elevated
            hover:border-primary/40
          `"
          type="button"
          class="
            flex min-h-28 items-center gap-3 rounded-xl border p-3 text-left
            transition
          "
          @click="toggleRecipe(recipe.id)"
        >
          <img
            v-if="recipe.image"
            :src="recipe.image.url"
            :alt="recipe.name"
            class="size-16 shrink-0 rounded-lg object-cover"
          >
          <span
            v-else
            class="
              grid size-16 shrink-0 place-items-center rounded-lg bg-primary/10
              text-primary
            "
          >
            <UIcon
              name="i-lucide-chef-hat"
              class="size-6"
            />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate font-semibold text-highlighted">{{ recipe.name }}</span>
            <span class="mt-1 block text-sm text-muted">{{ recipe.defaultPortions }} portions</span>
          </span>
          <UIcon
            :name="selectedRecipeIds.includes(recipe.id) ? 'i-lucide-circle-check' : 'i-lucide-circle'"
            class="size-5 shrink-0 text-primary"
          />
        </button>
      </div>
    </div>

    <div
      v-else
      class="
        grid gap-6
        xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]
      "
    >
      <section class="flex flex-col gap-3">
        <h2 class="text-sm font-semibold text-muted">
          Meals and portions
        </h2>
        <UPageCard
          v-for="selection in selectedRecipes"
          :key="selection.recipeId"
        >
          <div class="flex items-center justify-between gap-4">
            <div class="min-w-0">
              <p class="truncate font-semibold text-highlighted">
                {{ selection.recipe.name }}
              </p>
              <p class="text-sm text-muted">
                Default: {{ selection.recipe.defaultPortions }} portions
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <UButton
                :disabled="selection.portions === 1"
                :aria-label="`Decrease ${selection.recipe.name} portions`"
                color="neutral"
                icon="i-lucide-minus"
                size="sm"
                variant="ghost"
                @click="changePortions(selection.recipeId, -1)"
              />
              <span class="w-16 text-center font-semibold text-highlighted">{{ selection.portions }}</span>
              <UButton
                :aria-label="`Increase ${selection.recipe.name} portions`"
                color="neutral"
                icon="i-lucide-plus"
                size="sm"
                variant="ghost"
                @click="changePortions(selection.recipeId, 1)"
              />
            </div>
          </div>
        </UPageCard>
      </section>
      <section class="flex flex-col gap-3">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="font-semibold text-highlighted">
              Shopping list
            </h2>
            <p class="text-sm text-muted">
              Untick anything already at home.
            </p>
          </div>
          <span class="text-sm text-muted">{{ includedRecipeIngredientIds.length }} included</span>
        </div>
        <KitchenLoading
          v-if="previewQuery.isPending.value"
          label="Gathering ingredients"
        />
        <UAlert
          v-else-if="previewQuery.error.value"
          color="error"
          icon="i-lucide-circle-alert"
          title="Could not load ingredients"
          description="Go back to your recipes and try the review again."
        />
        <button
          v-for="item in previewQuery.data.value || []"
          :key="item.recipeIngredientId"
          type="button"
          class="
            flex items-center gap-3 rounded-xl border border-default bg-elevated
            p-3 text-left transition
            hover:border-primary/40
          "
          @click="toggleIngredient(item.recipeIngredientId)"
        >
          <UIcon
            :name="includedRecipeIngredientIds.includes(item.recipeIngredientId) ? 'i-lucide-circle-check' : 'i-lucide-circle'"
            class="size-5 shrink-0 text-primary"
          />
          <span class="min-w-0 flex-1">
            <span class="block font-medium text-highlighted">{{ item.name }}</span>
            <span class="block text-sm text-muted">
              {{ item.recipeName }}
              <span v-if="item.isPantryStaple"> · pantry staple</span>
              <span v-else-if="item.isOptional"> · optional</span>
            </span>
          </span>
          <span
            v-if="item.amount !== null"
            class="shrink-0 text-sm text-muted"
          >{{ item.amount }} {{ item.unit }}</span>
        </button>
        <UButton
          :disabled="previewQuery.isPending.value || Boolean(previewQuery.error.value) || selections.length === 0"
          :loading="addMealPlanMutation.isLoading.value"
          icon="i-lucide-calendar-plus"
          label="Create meal plan"
          size="lg"
          @click="saveMealPlan"
        />
      </section>
    </div>
  </PageShell>
</template>
