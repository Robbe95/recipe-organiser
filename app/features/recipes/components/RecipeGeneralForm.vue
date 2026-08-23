<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import RecipeImageUpload from '~/features/images/components/RecipeImageUpload.vue'

import type { RecipeForm } from './recipeEditorTypes'

defineProps<{
  cuisineOptions: string[]
  estimatedCalories: number
  sourceOptions: string[]
  tagOptions: string[]
}>()

const emit = defineEmits<{
  addTag: [value: string]
  clearCuisine: []
  clearSource: []
  createCuisine: [value: string]
  createSource: [value: string]
  removeTag: [value: string]
}>()
const recipe = defineModel<RecipeForm>('recipe', {
  required: true,
})
</script>

<template>
  <section
    class="
      flex flex-col gap-5
      [&_.inline-flex]:w-full
    "
  >
    <RecipeImageUpload v-model="recipe.imageId" />
    <div class="flex flex-col gap-1">
      <p class="text-sm font-medium text-primary">
        General details
      </p>
      <p class="text-sm text-toned">
        Everything someone needs to recognise, find, and return to this recipe.
      </p>
    </div>

    <div
      class="
        grid gap-4
        sm:grid-cols-[minmax(0,1fr)_160px]
      "
    >
      <UFormField
        label="Recipe name"
        required
      >
        <UInput
          v-model="recipe.name"
          placeholder="e.g. Crispy tofu bowls"
          size="lg"
        />
      </UFormField>
      <UFormField
        label="Portions"
        required
      >
        <UInput
          v-model.number="recipe.defaultPortions"
          :min="1"
          :max="100"
          type="number"
          size="lg"
        />
      </UFormField>
    </div>
    <UFormField
      label="Description"
      hint="Optional"
    >
      <UTextarea
        v-model="recipe.description"
        :rows="3"
        placeholder="A short note about this recipe…"
      />
    </UFormField>
    <div
      class="
        grid gap-4
        sm:grid-cols-2
      "
    >
      <UFormField
        label="Cuisine"
        hint="Optional"
      >
        <USelectMenu
          v-model="recipe.cuisine"
          :items="cuisineOptions"
          class="w-full"
          create-item="always"
          placeholder="Choose or add a cuisine"
          clear
          @clear="emit('clearCuisine')"
          @create="emit('createCuisine', $event)"
        />
      </UFormField>
      <UFormField
        label="Tags"
        hint="Optional"
      >
        <USelectMenu
          v-model="recipe.tags"
          :items="tagOptions"
          class="w-full"
          create-item="always"
          placeholder="Choose or add tags"
          multiple
          @create="emit('addTag', $event)"
        >
          <template #default>
            <div class="flex min-w-0 flex-1 flex-wrap items-center gap-1">
              <template v-if="recipe.tags.length > 0">
                <UBadge
                  v-for="tag in recipe.tags"
                  :key="tag"
                  color="neutral"
                  variant="subtle"
                  class="
                    flex flex-none items-center gap-1 px-0 py-0.5 pl-2
                    text-nowrap
                  "
                >
                  {{ tag }}
                  <UButton
                    as="span"
                    icon="i-lucide-x"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    class="my-0 py-0"
                    aria-label="Remove tag"
                    @click.stop="emit('removeTag', tag)"
                  />
                </UBadge>
              </template>
              <span
                v-else
                class="text-dimmed"
              >Choose or add tags</span>
            </div>
          </template>
        </USelectMenu>
      </UFormField>
    </div>
    <div
      class="
        grid gap-4
        sm:grid-cols-2
      "
    >
      <UFormField
        label="Prep time"
        hint="Minutes"
      >
        <UInput
          v-model.number="recipe.prepTimeMinutes"
          type="number"
          min="0"
          placeholder="15"
        />
      </UFormField>
      <UFormField
        label="Cook time"
        hint="Minutes"
      >
        <UInput
          v-model.number="recipe.cookTimeMinutes"
          type="number"
          min="0"
          placeholder="30"
        />
      </UFormField>
    </div>
    <div
      class="
        grid gap-4
        sm:grid-cols-2
      "
    >
      <UFormField
        :hint="`Leave blank to use the ingredient estimate (${estimatedCalories} kcal)`"
        label="Dish calories"
      >
        <UInput
          v-model.number="recipe.caloriesOverride"
          type="number"
          min="0"
          placeholder="Calculated automatically"
        />
      </UFormField>
      <div class="rounded-lg bg-muted/50 px-4 py-3">
        <p
          class="text-xs font-medium text-toned"
        >
          Estimated calories
        </p><p
          class="mt-1 text-lg font-semibold text-highlighted"
        >
          {{ estimatedCalories }} kcal
        </p><p
          class="text-xs text-toned"
        >
          From the ingredient amounts entered.
        </p>
      </div>
    </div>
    <div
      class="
        grid gap-4
        sm:grid-cols-2
      "
    >
      <UFormField
        label="Source"
        hint="Optional"
      >
        <USelectMenu
          v-model="recipe.sourceName"
          :items="sourceOptions"
          class="w-full"
          create-item="always"
          placeholder="Choose or add a source"
          clear
          @clear="emit('clearSource')"
          @create="emit('createSource', $event)"
        />
      </UFormField>
      <UFormField
        label="Source link"
        hint="Optional"
      >
        <UInput
          v-model="recipe.sourceUrl"
          type="url"
          placeholder="https://…"
        />
      </UFormField>
    </div>
    <UFormField
      label="Personal notes"
      hint="Optional"
    >
      <UTextarea
        v-model="recipe.notes"
        :rows="4"
        placeholder="What would you change next time?"
      />
    </UFormField>
  </section>
</template>
