<script setup lang="ts">
import type { IngredientRow } from './recipeEditorTypes'

const props = defineProps<{
  ingredientOptions: Array<{ id: string
    name: string }>
  sections: string[]
}>()
const emit = defineEmits<{
  create: [name: string]
  move: [sectionName: string]
  remove: []
  select: []
}>()
const item = defineModel<IngredientRow>('item', {
  required: true,
})

const moveItems = computed(() => [
  [
    {
      icon: 'i-lucide-list',
      label: 'Ingredients',
      onSelect: () => emit('move', ''),
    },
    ...props.sections.map((section) => ({
      icon: 'i-lucide-list-tree',
      label: section,
      onSelect: () => emit('move', section),
    })),
  ],
])

function unitLabel() {
  return item.value.unit || '—'
}
</script>

<template>
  <div
    class="
      grid items-center gap-3
      sm:grid-cols-[auto_minmax(0,1fr)_140px_auto_auto_auto]
    "
  >
    <UButton
      class="cursor-grab"
      icon="i-lucide-grip-vertical"
      color="neutral"
      variant="ghost"
      aria-label="Reorder ingredient"
      data-recipe-ingredient-drag-handle
    />
    <USelectMenu
      v-model="item.ingredientId"
      :items="ingredientOptions"
      :filter-fields="['name']"
      value-key="id"
      label-key="name"
      create-item="always"
      class="w-full"
      placeholder="Search or add an ingredient"
      @create="emit('create', $event)"
      @update:model-value="emit('select')"
    />
    <div class="flex items-center gap-2">
      <UInput
        v-model.number="item.amount"
        class="w-20"
        type="number"
        min="0"
        step="any"
        placeholder="Amount"
      />
      <span class="min-w-12 text-sm text-toned">{{ unitLabel() }}</span>
    </div>
    <UCheckbox
      v-model="item.isOptional"
      label="Optional"
    />
    <UDropdownMenu :items="moveItems">
      <UButton
        icon="i-lucide-folder-input"
        color="neutral"
        variant="ghost"
        aria-label="Move ingredient to section"
      />
    </UDropdownMenu>
    <UButton
      icon="i-lucide-trash-2"
      color="neutral"
      variant="ghost"
      aria-label="Remove ingredient"
      @click="emit('remove')"
    />
  </div>
</template>
