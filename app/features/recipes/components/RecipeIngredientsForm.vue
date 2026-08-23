<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import VueDraggable from 'vuedraggable'

import type { IngredientRow } from './recipeEditorTypes'
import RecipeIngredientCard from './RecipeIngredientCard.vue'
import RecipeIngredientQuickAdd from './RecipeIngredientQuickAdd.vue'

interface IngredientOption {
  id: string
  typeId: string | null
  name: string
}
interface IngredientType {
  id: string
  name: string
  icon: string
}

const props = defineProps<{
  ingredientOptions: IngredientOption[]
  ingredientTypes: IngredientType[]
}>()
const emit = defineEmits<{
  create: [name: string, row: IngredientRow]
  quickAdd: [value: string]
  remove: [row: IngredientRow]
  setDetails: [row: IngredientRow]
}>()
const ingredients = defineModel<IngredientRow[]>('ingredients', {
  required: true,
})
const groups = computed(() => {
  const items = new Map<string, IngredientRow[]>()

  for (const row of ingredients.value) {
    const typeId = props.ingredientOptions.find((item) => item.id === row.ingredientId)?.typeId || 'other'

    items.set(typeId, [
      ...(items.get(typeId) || []),
      row,
    ])
  }

  return [
    ...props.ingredientTypes.map((type) => ({
      ...type,
      rows: items.get(type.id) || [],
    })).filter((group) => group.rows.length),
    ...(items.get('other')?.length
      ? [
          {
            id: 'other',
            name: 'Other ingredients',
            icon: 'i-lucide-package',
            rows: items.get('other') || [],
          },
        ]
      : []),
  ]
})

function syncOrder() {
  ingredients.value = groups.value.flatMap((group) => group.rows)
}
</script>

<template>
  <section class="flex flex-col gap-5">
    <div class="flex items-end justify-between gap-4">
      <div
        class="flex flex-col gap-1"
      >
        <h2
          class="text-xl font-semibold text-highlighted"
        >
          Ingredients
        </h2><p
          class="text-sm text-toned"
        >
          Add ingredients, then drag them to order each category.
        </p>
      </div>
    </div>
    <RecipeIngredientQuickAdd
      :ingredients="ingredientOptions"
      @add="emit('quickAdd', $event)"
    />
    <section
      v-for="group in groups"
      :key="group.id"
      class="flex flex-col gap-2"
    >
      <div
        class="flex items-center gap-2"
      >
        <UIcon
          :name="group.icon"
          class="size-4 text-primary"
        /><h3
          class="font-medium text-highlighted"
        >
          {{ group.name }}
        </h3>
      </div><VueDraggable
        :list="group.rows"
        :animation="200"
        item-key="ingredientId"
        tag="div"
        handle="[data-recipe-ingredient-drag-handle]"
        ghost-class="recipe-ingredient-ghost"
        class="flex flex-col gap-2"
        @end="syncOrder"
      >
        <template #item="{ element: item }">
          <div>
            <RecipeIngredientCard
              :item="item"
              :ingredient-options="ingredientOptions"
              @create="emit('create', $event, item)"
              @remove="emit('remove', item)"
              @select="emit('setDetails', item)"
              @update:item="Object.assign(item, $event)"
            />
          </div>
        </template>
      </VueDraggable>
    </section>
    <UEmpty
      v-if="groups.length === 0"
      icon="i-lucide-shopping-basket"
      title="Start your ingredient list"
      description="Add the first ingredient to build your recipe."
    />
  </section>
</template>

<style scoped>
.recipe-ingredient-ghost {
  opacity: 0.45;
}
</style>
