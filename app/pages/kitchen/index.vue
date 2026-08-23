<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import { useRecipesQuery } from '~/features/recipes/api/listRecipes.query'
import CancelCookingModal from '~/features/recipes/components/CancelCookingModal.vue'

definePageMeta({
  layout: 'kitchen',
})

const recipesQuery = useRecipesQuery()
const recipes = computed(() => recipesQuery.data.value || [])
const search = ref('')
const selectedTags = ref<string[]>([])
const selectedIngredients = ref<string[]>([])
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
      mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8
      sm:px-6 sm:py-12
    "
  >
    <div class="flex flex-col gap-2">
      <p class="text-sm font-medium text-primary">
        What are we making?
      </p>
      <h1
        class="
          text-3xl font-semibold tracking-tight text-highlighted
          sm:text-4xl
        "
      >
        Pick a recipe and start cooking.
      </h1>
    </div>
    <section
      v-if="resumableRecipes.length > 0"
      class="flex flex-col gap-3"
    >
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-play-circle"
          class="text-primary"
        />
        <h2 class="font-semibold text-highlighted">
          Resume cooking
        </h2>
      </div>
      <div
        class="
          grid gap-3
          sm:grid-cols-2
        "
      >
        <UPageCard
          v-for="recipe in resumableRecipes"
          :key="recipe.id"
        >
          <div class="flex items-center justify-between gap-3">
            <span class="min-w-0 truncate font-medium text-highlighted">{{ recipe.name }}</span>
            <div class="flex shrink-0 items-center gap-1">
              <UButton
                :to="`/kitchen/recipes/${recipe.id}`"
                label="Resume"
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
        </UPageCard>
      </div>
    </section>
    <div
      class="
        grid gap-3
        md:grid-cols-[minmax(0,1fr)_14rem_14rem]
      "
    >
      <UInput
        v-model="search"
        icon="i-lucide-search"
        size="xl"
        placeholder="Search recipes or ingredients"
      />
      <USelectMenu
        v-model="selectedIngredients"
        :items="ingredientOptions"
        icon="i-lucide-carrot"
        placeholder="Any ingredients"
        multiple
      />
      <USelectMenu
        v-model="selectedTags"
        :items="tagOptions"
        icon="i-lucide-tags"
        placeholder="Any tags"
        multiple
      />
    </div>
    <div
      v-if="recipesQuery.isPending.value"
      class="
        grid gap-4
        sm:grid-cols-2
        lg:grid-cols-3
      "
    >
      <USkeleton
        v-for="index in 6"
        :key="index"
        class="aspect-4/3 rounded-2xl"
      />
    </div>
    <UEmpty
      v-else-if="filteredRecipes.length === 0"
      icon="i-lucide-cooking-pot"
      title="No recipes found"
      description="Try a different ingredient or search term."
    />
    <div
      v-else
      class="
        grid auto-rows-44 gap-3
        sm:grid-cols-2
        lg:grid-cols-3
      "
    >
      <NuxtLink
        v-for="(recipe, index) in filteredRecipes"
        :key="recipe.id"
        :to="`/kitchen/recipes/${recipe.id}`"
        :class="index === 0 ? 'sm:col-span-2 sm:row-span-2' : ''"
        class="group relative overflow-hidden rounded-2xl bg-elevated"
      >
        <img
          v-if="recipe.image"
          :src="recipe.image.url"
          :alt="recipe.name"
          class="
            absolute inset-0 size-full object-cover transition-transform
            duration-300
            group-hover:scale-105
          "
        >
        <div
          v-else
          class="absolute inset-0 bg-primary/10"
        />
        <div
          class="
            absolute inset-0 bg-linear-to-t from-black/80 via-black/10
            to-transparent
          "
        />
        <div
          class="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4 text-white"
        >
          <span class="text-lg font-semibold">{{ recipe.name }}</span>
          <span
            v-if="recipe.description"
            class="line-clamp-1 text-sm text-white/75"
          >{{ recipe.description }}</span>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
