<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import { useRecipesQuery } from '~/features/recipes/api/listRecipes.query'
import CancelCookingModal from '~/features/recipes/components/CancelCookingModal.vue'

definePageMeta({
  layout: 'kitchen',
  middleware: 'auth',
  viewTransition: true,
})

const recipesQuery = useRecipesQuery()
const recipes = computed(() => recipesQuery.data.value || [])
const search = ref('')
const selectedTags = ref<string[]>([])
const selectedIngredients = ref<string[]>([])
const selectedRecipeIds = ref<string[]>([])
const selectingMealPlan = ref(false)
const resumableRecipeIds = ref<string[]>([])
const overlay = useOverlay()
const cancelCookingModal = overlay.create(CancelCookingModal)
const tagOptions = computed(() => Array.from(new Set(recipes.value.flatMap((recipe) => recipe.tags))).sort())
const ingredientOptions = computed(() => Array.from(new Set(recipes.value
  .flatMap((recipe) => recipe.ingredients))).sort())
const filteredRecipes = computed(() => {
  const term = search.value.trim().toLowerCase()

  return recipes.value.filter((recipe) => {
    const matchesSearch = !term || [
      recipe.name,
      recipe.description || '',
      ...recipe.tags,
      ...recipe.ingredients,
    ]
      .some((value) => value.toLowerCase().includes(term))

    return matchesSearch
      && selectedTags.value.every((tag) => recipe.tags.includes(tag))
      && selectedIngredients.value.every((ingredient) => recipe.ingredients.includes(ingredient))
  })
})
const resumableRecipes = computed(() => recipes.value.filter((recipe) => resumableRecipeIds.value.includes(recipe.id)))
const mealPlanAddTarget = computed(() => ({
  query: {
    recipes: selectedRecipeIds.value.join(','),
  },
  path: '/kitchen/meal-plan/add',
}))

async function cancelCooking(recipe: {
  id: string
  name: string
}) {
  const confirmed = await cancelCookingModal.open({
    recipeName: recipe.name,
  })

  if (!confirmed) {
    return
  }

  localStorage.removeItem(`recipe-organiser:cooking:${recipe.id}`)
  resumableRecipeIds.value = resumableRecipeIds.value.filter((id) => id !== recipe.id)
}

function toggleMealPlanRecipe(recipeId: string) {
  selectedRecipeIds.value = selectedRecipeIds.value.includes(recipeId)
    ? selectedRecipeIds.value.filter((id) => id !== recipeId)
    : [
        ...selectedRecipeIds.value,
        recipeId,
      ]
}

onMounted(() => {
  resumableRecipeIds.value = Array.from({
    length: localStorage.length,
  }).flatMap((_, index) => {
    const key = localStorage.key(index)
    const match = key?.match(/^recipe-organiser:cooking:([\w-]+)$/)

    return match
      ? [
          match[1]!,
        ]
      : []
  })
})
</script>

<template>
  <div
    class="
      mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 pt-6
      sm:px-6
      md:max-w-6xl md:gap-6 md:px-8 md:pt-10
    "
  >
    <div class="flex items-start justify-between gap-4">
      <div class="flex flex-col gap-1">
        <h1
          class="
            text-[2.15rem] leading-none font-bold tracking-tight
            text-highlighted
          "
        >
          {{ selectingMealPlan ? 'Choose meals' : 'Recipes' }}
        </h1>
        <p class="text-sm text-muted">
          {{ selectingMealPlan ? 'Pick what you want to cook.' : 'Your kitchen, ready when you are.' }}
        </p>
      </div>
      <UButton
        v-if="!selectingMealPlan"
        aria-label="Start a meal plan"
        class="size-11 justify-center rounded-full"
        icon="i-lucide-calendar-plus"
        @click="selectingMealPlan = true"
      />
      <div
        v-else
        class="flex shrink-0 items-center gap-2"
      >
        <UButton
          color="neutral"
          variant="ghost"
          label="Cancel"
          @click="selectingMealPlan = false; selectedRecipeIds = []"
        />
        <UButton
          :to="mealPlanAddTarget"
          :disabled="selectedRecipeIds.length === 0"
          :label="`Add ${selectedRecipeIds.length || ''}`.trim()"
          icon="i-lucide-arrow-right"
        />
      </div>
    </div>
    <section
      v-if="resumableRecipes.length > 0"
      class="
        flex flex-col gap-3 rounded-3xl bg-elevated/50 p-4 ring-1 ring-default
      "
    >
      <div class="flex items-center gap-3">
        <span
          class="
            grid size-9 place-items-center rounded-xl bg-primary/10 text-primary
          "
        >
          <UIcon
            name="i-lucide-play"
            class="size-4"
          />
        </span>
        <div class="flex flex-col gap-0.5">
          <h2 class="font-semibold text-highlighted">
            Continue cooking
          </h2>
          <p class="text-sm text-muted">
            Your in-progress recipes are saved here.
          </p>
        </div>
      </div>
      <div
        class="
          grid gap-2
          md:grid-cols-2
        "
      >
        <div
          v-for="recipe in resumableRecipes"
          :key="recipe.id"
          class="
            flex min-w-0 items-center gap-3 rounded-2xl bg-default/70 p-2
            shadow-sm ring-1 ring-default
          "
        >
          <img
            v-if="recipe.image"
            :src="recipe.image.url"
            :alt="recipe.name"
            class="size-12 shrink-0 rounded-xl object-cover"
          >
          <span
            v-else
            class="
              grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10
              text-primary
            "
          >
            <UIcon
              name="i-lucide-chef-hat"
              class="size-5"
            />
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate font-semibold text-highlighted">
              {{ recipe.name }}
            </p>
            <p class="text-xs text-muted">
              Ready to continue
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-1">
            <UButton
              :to="`/kitchen/recipes/${recipe.id}`"
              aria-label="Resume cooking"
              class="size-9 justify-center rounded-xl"
              icon="i-lucide-play"
              size="sm"
            />
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="sm"
              aria-label="Cancel cooking"
              @click="cancelCooking(recipe)"
            />
          </div>
        </div>
      </div>
    </section>
    <div
      class="flex flex-col gap-3"
    >
      <UInput
        v-model="search"
        icon="i-lucide-search"
        size="xl"
        placeholder="Search recipes or ingredients"
      />
      <div
        class="
          flex items-center gap-2 overflow-x-auto pb-1
          md:pb-0
        "
      >
        <USelectMenu
          v-model="selectedIngredients"
          :items="ingredientOptions"
          icon="i-lucide-carrot"
          placeholder="Ingredients"
          size="sm"
          multiple
        />
        <USelectMenu
          v-model="selectedTags"
          :items="tagOptions"
          icon="i-lucide-tags"
          placeholder="Tags"
          size="sm"
          multiple
        />
      </div>
    </div>
    <KitchenAsyncState :pending="recipesQuery.isPending.value">
      <template #loading>
        <KitchenLoading label="Warming up your recipe box" />
      </template>
      <UEmpty
        v-if="filteredRecipes.length === 0"
        icon="i-lucide-cooking-pot"
        title="No recipes found"
        description="Try a different ingredient or search term."
      />
      <div
        v-else
        class="
          flex flex-col gap-2
          md:grid md:grid-cols-2 md:gap-3
        "
      >
        <NuxtLink
          v-for="recipe in filteredRecipes"
          :key="recipe.id"
          :to="selectingMealPlan ? undefined : `/kitchen/recipes/${recipe.id}`"
          :class="[
            selectingMealPlan && selectedRecipeIds.includes(recipe.id) ? `
              ring-2 ring-primary
            ` : '',
          ]"
          class="
            group flex min-h-24 items-center gap-4 rounded-2xl bg-elevated p-2
            shadow-sm ring-1 ring-default transition
            active:scale-[0.99]
            md:min-h-28 md:p-3
          "
          @click="selectingMealPlan && toggleMealPlanRecipe(recipe.id)"
        >
          <img
            v-if="recipe.image"
            :src="recipe.image.url"
            :alt="recipe.name"
            class="
              size-20 shrink-0 rounded-xl object-cover
              md:size-24
            "
          >
          <div
            v-else
            class="
              size-20 shrink-0 rounded-xl bg-primary/10
              md:size-24
            "
          />
          <div
            class="relative flex min-w-0 flex-1 flex-col gap-1 pr-2"
          >
            <UIcon
              v-if="selectingMealPlan"
              :name="selectedRecipeIds.includes(recipe.id) ? 'i-lucide-circle-check' : 'i-lucide-circle'"
              class="absolute top-1 right-1 size-6 text-primary"
            />
            <span class="truncate text-base font-semibold text-highlighted">{{ recipe.name }}</span>
            <span
              v-if="recipe.description"
              class="line-clamp-2 text-sm text-muted"
            >{{ recipe.description }}</span>
          </div>
        </NuxtLink>
      </div>
    </KitchenAsyncState>
  </div>
</template>
