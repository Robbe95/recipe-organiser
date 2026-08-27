<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import VueDraggable from 'vuedraggable'

import type { IngredientRow } from './recipeEditorTypes'
import RecipeIngredientCard from './RecipeIngredientCard.vue'
import RecipeIngredientQuickAdd from './RecipeIngredientQuickAdd.vue'

interface IngredientOption { id: string
  typeId: string | null
  name: string }
interface IngredientType { id: string
  name: string
  icon: string }
interface CategoryGroup { id: string
  name: string
  icon: string
  rows: IngredientRow[] }

const props = defineProps<{ ingredientOptions: IngredientOption[]
  ingredientTypes: IngredientType[] }>()
const emit = defineEmits<{
  create: [name: string, row: IngredientRow]
  quickAdd: [value: string]
  remove: [row: IngredientRow]
  setDetails: [row: IngredientRow]
}>()
const ingredients = defineModel<IngredientRow[]>('ingredients', {
  required: true,
})
const sections = defineModel<string[]>('sections', {
  required: true,
})

const normalizedSections = computed(() => [
  ...new Set(sections.value.map((section) => section.trim()).filter(Boolean)),
])
const sectionGroups = computed(() => {
  const sectionNames = [
    ...(ingredients.value.some((row) => !row.groupName.trim())
      ? [
          'Ingredients',
        ]
      : []),
    ...normalizedSections.value,
  ]

  return sectionNames.map((sectionName) => ({
    id: sectionName === 'Ingredients' ? 'default' : `section:${sectionName}`,
    isDefault: sectionName === 'Ingredients',
    name: sectionName,
    categories: categoriesFor(sectionName === 'Ingredients' ? '' : sectionName),
  })).filter((section) => section.isDefault ? section.categories.length > 0 : true)
})

function categoriesFor(sectionName: string): CategoryGroup[] {
  const rowsByType = new Map<string, IngredientRow[]>()

  for (const row of ingredients.value) {
    if (row.groupName.trim() !== sectionName) {
      continue
    }
    const typeId = props.ingredientOptions.find((item) => item.id === row.ingredientId)?.typeId || 'other'

    rowsByType.set(typeId, [
      ...(rowsByType.get(typeId) || []),
      row,
    ])
  }

  const typedCategories = props.ingredientTypes.flatMap((type) => {
    const rows = rowsByType.get(type.id)

    return rows
      ? [
          {
            id: type.id,
            name: type.name,
            icon: type.icon,
            rows,
          },
        ]
      : []
  })
  const otherRows = rowsByType.get('other')

  return [
    ...typedCategories,
    ...(otherRows
      ? [
          {
            id: 'other',
            name: 'Other ingredients',
            icon: 'i-lucide-package',
            rows: otherRows,
          },
        ]
      : []),
  ]
}

function addSection() {
  const baseName = 'New section'
  let name = baseName
  let count = 2

  while (normalizedSections.value.includes(name)) {
    name = `${baseName} ${count}`
    count += 1
  }

  sections.value = [
    ...sections.value,
    name,
  ]
}

function renameSection(previousName: string, nextName: string) {
  const name = nextName.trim()

  if (!name || (name !== previousName && normalizedSections.value.includes(name))) {
    return
  }

  sections.value = sections.value.map((section) => section === previousName ? name : section)
  ingredients.value.forEach((row) => {
    if (row.groupName.trim() === previousName) {
      row.groupName = name
    }
  })
}

function removeSection(sectionName: string) {
  sections.value = sections.value.filter((section) => section !== sectionName)
  ingredients.value.forEach((row) => {
    if (row.groupName.trim() === sectionName) {
      row.groupName = ''
    }
  })
}

function moveIngredient(row: IngredientRow, sectionName: string) {
  row.groupName = sectionName
}

function syncOrder() {
  ingredients.value = sectionGroups.value.flatMap((section) => section.categories.flatMap((category) => category.rows))
}
</script>

<template>
  <section class="flex flex-col gap-5">
    <div class="flex items-end justify-between gap-4">
      <div class="flex flex-col gap-1">
        <h2 class="text-xl font-semibold text-highlighted">
          Ingredients
        </h2>
        <p class="text-sm text-toned">
          Keep categories inside each section, then move ingredients between sections when needed.
        </p>
      </div>
      <UButton
        label="Section"
        icon="i-lucide-plus"
        color="neutral"
        variant="soft"
        type="button"
        @click.prevent="addSection"
      />
    </div>
    <RecipeIngredientQuickAdd
      :ingredients="ingredientOptions"
      @add="emit('quickAdd', $event)"
    />
    <section
      v-for="(section, sectionIndex) in sectionGroups"
      :key="section.isDefault ? 'default' : sectionIndex"
      class="flex flex-col gap-4 rounded-xl border border-default p-4"
    >
      <div class="flex items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2">
          <UIcon
            :name="section.isDefault ? 'i-lucide-list' : 'i-lucide-list-tree'"
            class="size-4 shrink-0 text-primary"
          />
          <h3
            v-if="section.isDefault"
            class="font-semibold text-highlighted"
          >
            Ingredients
          </h3>
          <UInput
            v-else
            :model-value="section.name"
            class="w-full max-w-sm"
            aria-label="Section name"
            @update:model-value="renameSection(section.name, $event)"
          />
        </div>
        <UButton
          v-if="!section.isDefault"
          icon="i-lucide-trash-2"
          color="neutral"
          variant="ghost"
          aria-label="Remove section"
          @click="removeSection(section.name)"
        />
      </div>
      <div
        v-if="section.categories.length === 0"
        class="rounded-lg bg-elevated px-3 py-2 text-sm text-toned"
      >
        Move ingredients here with the move button.
      </div>
      <section
        v-for="category in section.categories"
        :key="category.id"
        class="flex flex-col gap-2"
      >
        <div class="flex items-center gap-2">
          <UIcon
            :name="category.icon"
            class="size-4 text-primary"
          />
          <h4 class="font-medium text-highlighted">
            {{ category.name }}
          </h4>
        </div>
        <VueDraggable
          :list="category.rows"
          :animation="200"
          item-key="ingredientId"
          tag="div"
          handle="[data-recipe-ingredient-drag-handle]"
          ghost-class="recipe-ingredient-ghost"
          class="flex flex-col gap-2"
          @end="syncOrder"
        >
          <template #item="{ element: item }">
            <RecipeIngredientCard
              :item="item"
              :ingredient-options="ingredientOptions"
              :sections="normalizedSections"
              @create="emit('create', $event, item)"
              @move="moveIngredient(item, $event)"
              @remove="emit('remove', item)"
              @select="emit('setDetails', item)"
              @update:item="Object.assign(item, $event)"
            />
          </template>
        </VueDraggable>
      </section>
    </section>
    <UEmpty
      v-if="sectionGroups.length === 0"
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
