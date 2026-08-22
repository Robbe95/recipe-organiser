<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import ImageUploadCard from '~/features/images/components/ImageUploadCard.vue'
import { useRecipesQuery } from '~/features/recipes/api/listRecipes.query'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

const recipesQuery = useRecipesQuery()
const recipes = computed(() => recipesQuery.data.value || [])
</script>

<template>
  <section
    class="
      mx-auto flex w-full max-w-5xl flex-col gap-8 py-4
      sm:py-10
    "
  >
    <div class="flex flex-col gap-3">
      <div class="flex items-center gap-2 text-sm font-medium text-primary">
        <UIcon
          name="i-lucide-chef-hat"
          class="size-4"
        />
        Your recipe book
      </div>
      <div class="flex flex-col gap-2">
        <h1
          class="
            text-3xl font-bold tracking-tight text-highlighted
            sm:text-4xl
          "
        >
          Ready when you are.
        </h1>
        <p class="max-w-xl text-base text-toned">
          Save recipes you love, then cook from a calm, hands-free step-by-step view.
        </p>
      </div>
    </div>

    <UPageCard
      v-if="recipesQuery.isPending.value || recipes.length === 0"
      class="
        border-dashed bg-default/70 py-14 text-center
        sm:py-20
      "
    >
      <div class="mx-auto flex max-w-sm flex-col items-center gap-4">
        <span
          class="
            grid size-14 place-items-center rounded-2xl bg-primary/10
            text-primary
          "
        >
          <UIcon
            name="i-lucide-notebook-pen"
            class="size-7"
          />
        </span>
        <div class="flex flex-col gap-1">
          <h2 class="text-lg font-semibold text-highlighted">
            Your recipe book is empty
          </h2>
          <p class="text-sm/6 text-toned">
            Soon you’ll be able to add a recipe from a photo, a link, or your own notes.
          </p>
        </div>
        <UButton
          label="Add your first recipe"
          icon="i-lucide-plus"
          to="/recipes/new"
        />
      </div>
    </UPageCard>

    <section
      v-else
      class="flex flex-col gap-4"
    >
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-highlighted">
          Your recipes
        </h2>
        <UButton
          label="New recipe"
          icon="i-lucide-plus"
          to="/recipes/new"
        />
      </div>
      <div
        class="
          grid gap-4
          sm:grid-cols-2
        "
      >
        <UPageCard
          v-for="recipe in recipes"
          :key="recipe.id"
          class="
            transition-colors
            hover:bg-elevated/50
          "
        >
          <div class="flex flex-col gap-2">
            <img
              v-if="recipe.image"
              :src="recipe.image.url"
              :alt="recipe.name"
              class="aspect-video w-full rounded-lg object-cover"
            >
            <div class="flex items-center justify-between gap-2">
              <UIcon
                name="i-lucide-chef-hat"
                class="size-5 text-primary"
              />
              <span class="text-xs text-toned">{{ recipe.defaultPortions }} portions</span>
            </div>
            <h3 class="font-semibold text-highlighted">
              {{ recipe.name }}
            </h3>
            <p
              v-if="recipe.description"
              class="line-clamp-2 text-sm text-toned"
            >
              {{ recipe.description }}
            </p>
            <UButton
              :to="`/recipes/${recipe.id}/edit`"
              label="Edit"
              icon="i-lucide-pencil"
              color="neutral"
              variant="soft"
            />
          </div>
        </UPageCard>
      </div>
    </section>

    <ImageUploadCard />
  </section>
</template>
