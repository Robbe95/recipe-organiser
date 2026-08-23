<script setup lang="ts">
import PageHeader from '~/components/page/PageHeader.vue'

type RecipeEditorTab = 'general' | 'ingredients' | 'steps'

defineProps<{
  editing: boolean
  loading: boolean
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
  <PageHeader
    :title="editing ? 'Edit recipe' : 'Create a recipe'"
    :breadcrumbs="[{ label: 'Recipes',
                     to: '/dashboard' }]"
    description="Build the recipe in three calm steps. Amounts are based on two portions."
  >
    <template #actions>
      <UButton
        :loading="loading"
        form="recipe-editor-form"
        type="submit"
        label="Save recipe"
        icon="i-lucide-check"
      />
    </template>
  </PageHeader>

  <UTabs
    v-model="activeTab"
    :items="tabs"
    :content="false"
    variant="link"
  />
</template>
