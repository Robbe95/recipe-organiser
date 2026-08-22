<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import type { IngredientRow } from './recipeEditorTypes'

defineProps<{
  ingredientOptions: Array<{ id: string
    name: string }>
  units: string[]
}>()

const emit = defineEmits<{
  add: []
  create: [name: string, row: IngredientRow]
  remove: [index: number]
  saveDetails: [row: IngredientRow]
  setDetails: [row: IngredientRow]
}>()
const ingredients = defineModel<IngredientRow[]>('ingredients', {
  required: true,
})
</script>

<template>
  <section class="flex flex-col gap-4">
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
          Search your ingredient library, or type a new ingredient to add it.
        </p>
      </div><UButton
        label="Add ingredient"
        icon="i-lucide-plus"
        variant="soft"
        @click="emit('add')"
      />
    </div>
    <div class="flex flex-col gap-3">
      <UCard
        v-for="(item, index) in ingredients"
        :key="index"
        :ui="{ body: 'p-3 sm:p-4' }"
      >
        <div
          class="
            grid items-end gap-3
            sm:grid-cols-[90px_100px_minmax(180px,1fr)_minmax(130px,0.7fr)_120px_120px_auto]
          "
        >
          <UFormField label="Amount">
            <UInput
              v-model.number="item.amount"
              type="number"
              min="0"
              step="any"
              placeholder="—"
            />
          </UFormField>
          <UFormField label="Unit">
            <USelectMenu
              v-model="item.unit"
              :items="units"
              class="w-full"
              placeholder="Unit"
            />
          </UFormField>
          <UFormField label="Ingredient">
            <USelectMenu
              v-model="item.ingredientId"
              :items="ingredientOptions"
              :filter-fields="['name']"
              value-key="id"
              label-key="name"
              create-item="always"
              class="w-full"
              placeholder="Search or create an ingredient"
              @create="emit('create', $event, item)"
              @update:model-value="emit('setDetails', item)"
            />
          </UFormField>
          <UFormField
            label="Preparation"
            hint="Optional"
          >
            <UInput
              v-model="item.note"
              placeholder="finely diced"
            />
          </UFormField>
          <UFormField label="Calories">
            <UInput
              v-model.number="item.calories"
              type="number"
              min="0"
              placeholder="e.g. 144"
              @blur="emit('saveDetails', item)"
            />
          </UFormField>
          <UFormField :label="`Per ${item.calorieUnit || item.unit || 'unit'}`">
            <UInput
              v-model.number="item.calorieAmount"
              type="number"
              min="0.001"
              step="any"
              placeholder="e.g. 100"
              @blur="emit('saveDetails', item)"
            />
          </UFormField>
          <div class="flex items-center gap-1 pb-0.5">
            <UCheckbox
              v-model="item.isOptional"
              label="Optional"
            /><UButton
              v-if="ingredients.length > 1"
              icon="i-lucide-trash-2"
              color="neutral"
              variant="ghost"
              aria-label="Remove ingredient"
              @click="emit('remove', index)"
            />
          </div>
        </div>
      </UCard>
    </div>
  </section>
</template>
