<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
type RecipeEditorTab = 'general' | 'ingredients' | 'steps'

defineProps<{
  editing: boolean
}>()

const activeTab = defineModel<RecipeEditorTab>('activeTab', {
  required: true,
})

const tabs = [
  {
    icon: 'i-lucide-notebook-pen',
    label: 'General',
    value: 'general',
  },
  {
    icon: 'i-lucide-shopping-basket',
    label: 'Ingredients',
    value: 'ingredients',
  },
  {
    icon: 'i-lucide-list-ordered',
    label: 'Steps',
    value: 'steps',
  },
]
</script>

<template>
  <div class="flex flex-col gap-2">
    <p class="text-sm font-medium text-primary">
      Your recipe book
    </p>
    <h1 class="text-3xl font-bold tracking-tight text-highlighted">
      {{ editing ? 'Edit recipe' : 'Create a recipe' }}
    </h1>
    <p class="text-sm text-toned">
      Build the recipe in three calm steps. Amounts are based on two portions.
    </p>
  </div>

  <UTabs
    v-model="activeTab"
    :items="tabs"
    :content="false"
    variant="link"
  />
</template>
