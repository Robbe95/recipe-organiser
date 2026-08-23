<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import ConfirmDeleteModal from '~/components/ConfirmDeleteModal.vue'
import PageHeader from '~/components/page/PageHeader.vue'
import PageShell from '~/components/page/PageShell.vue'
import {
  useIngredientTypeMutations,
  useLibraryIngredientMutations,
} from '~/features/ingredients/api/manageIngredients.mutation'
import IngredientCard from '~/features/ingredients/components/IngredientCard.vue'
import IngredientFormModal from '~/features/ingredients/components/IngredientFormModal.vue'
import IngredientTypeCard from '~/features/ingredients/components/IngredientTypeCard.vue'
import IngredientTypeFormModal from '~/features/ingredients/components/IngredientTypeFormModal.vue'
import { useRecipeFormDataQuery } from '~/features/recipes/api/listRecipeFormData.query'

const formDataQuery = useRecipeFormDataQuery()
const units = [
  'g',
  'kg',
  'ml',
  'l',
  'tsp',
  'tbsp',
  'amount',
  'can',
  'package',
]
const search = ref('')
const activeTab = ref('ingredients')
const selectionAnchorId = ref<string | null>(null)
const selectedIngredientIds = ref<string[]>([])
const editingIngredientId = ref<string | null>(null)
const editingTypeId = ref<string | null>(null)
const overlay = useOverlay()
const confirmDeleteModal = overlay.create(ConfirmDeleteModal)
const ingredientFormModal = overlay.create(IngredientFormModal)
const ingredientTypeFormModal = overlay.create(IngredientTypeFormModal)
const newIngredient = reactive({
  typeId: '',
  name: '',
  calorieAmount: undefined as number | undefined,
  calories: undefined as number | undefined,
  defaultUnit: '',
})
const newType = reactive({
  name: '',
  icon: 'i-lucide-package',
})
const ingredientMutations = useLibraryIngredientMutations()
const typeMutations = useIngredientTypeMutations()
const tabs = [
  {
    icon: 'i-lucide-carrot',
    label: 'Ingredients',
    value: 'ingredients',
  },
  {
    icon: 'i-lucide-tags',
    label: 'Ingredient types',
    value: 'types',
  },
]
const normalizedSearch = computed(() => search.value.trim().toLowerCase())
const ingredientGroups = computed(() => {
  const data = formDataQuery.data.value

  if (!data) {
    return []
  }

  return data.types.map((type) => ({
    ...type,
    ingredients: data.ingredients.filter((ingredient) => {
      const matchesSearch = !normalizedSearch.value
        || ingredient.name.toLowerCase().includes(normalizedSearch.value)

      return ingredient.typeId === type.id && matchesSearch
    }),
  })).filter((group) => group.ingredients.length > 0)
})
const visibleIngredientCount = computed(() => ingredientGroups.value.reduce(
  (total, group) => total + group.ingredients.length,
  0,
))
const visibleIngredientIds = computed(() => ingredientGroups.value.flatMap((group) => (
  group.ingredients.map((ingredient) => ingredient.id)
)))
const selectedIngredientCount = computed(() => selectedIngredientIds.value.length)

function selectIngredient(event: MouseEvent, item: { id: string }) {
  const selected = new Set(selectedIngredientIds.value)

  if (event.shiftKey && selectionAnchorId.value) {
    const start = visibleIngredientIds.value.indexOf(selectionAnchorId.value)
    const end = visibleIngredientIds.value.indexOf(item.id)

    if (start !== -1 && end !== -1) {
      const [
        from,
        to,
      ] = start < end
        ? [
            start,
            end,
          ]
        : [
            end,
            start,
          ]

      visibleIngredientIds.value.slice(from, to + 1).forEach((id) => selected.add(id))
    }
  }
  else if (selected.has(item.id)) {
    selected.delete(item.id)
    selectionAnchorId.value = null
  }
  else {
    selected.add(item.id)
    selectionAnchorId.value = item.id
  }

  selectedIngredientIds.value = [
    ...selected,
  ]
}

function clearIngredientSelection() {
  selectedIngredientIds.value = []
  selectionAnchorId.value = null
}

async function addIngredient() {
  if (!newIngredient.name.trim()) {
    return
  }

  await ingredientMutations.create.mutateAsync({
    ...newIngredient,
    typeId: newIngredient.typeId || null,
    calorieAmount: newIngredient.calorieAmount ?? null,
    calories: newIngredient.calories ?? null,
    calorieUnit: newIngredient.defaultUnit || null,
    defaultUnit: newIngredient.defaultUnit || null,
  })
  Object.assign(newIngredient, {
    typeId: '',
    name: '',
    calorieAmount: undefined,
    calories: undefined,
    defaultUnit: '',
  })
}

async function saveIngredient(item: { id: string
  typeId: string | null
  name: string
  calorieAmount: number | null
  calories: number | null
  calorieUnit: string | null
  defaultUnit: string | null }) {
  await ingredientMutations.update.mutateAsync(item)
}

async function addType() {
  if (!newType.name.trim()) {
    return
  }

  await typeMutations.create.mutateAsync(newType)
  newType.name = ''
}

async function saveType(item: { id: string
  name: string
  icon: string }) {
  await typeMutations.update.mutateAsync(item)
}

async function openNewIngredient() {
  editingIngredientId.value = null
  Object.assign(newIngredient, {
    typeId: '',
    name: '',
    calorieAmount: undefined,
    calories: undefined,
    defaultUnit: '',
  })

  const submitted = await ingredientFormModal.open({
    editing: false,
    initialForm: newIngredient,
    types: formDataQuery.data.value?.types || [],
    units,
  })

  if (!submitted) {
    return
  }

  Object.assign(newIngredient, submitted)
  await submitIngredient()
}

async function openIngredient(item: { id: string
  typeId: string | null
  name: string
  calorieAmount: number | null
  calories: number | null
  caloriesPer100g: number | null
  calorieUnit: string | null
  defaultUnit: string | null }) {
  editingIngredientId.value = item.id
  Object.assign(newIngredient, {
    ...item,
    typeId: item.typeId || '',
    calorieAmount: item.calorieAmount ?? (item.caloriesPer100g ? 100 : undefined),
    calories: item.calories ?? item.caloriesPer100g ?? undefined,
    defaultUnit: item.defaultUnit || '',
  })

  const submitted = await ingredientFormModal.open({
    editing: true,
    initialForm: newIngredient,
    types: formDataQuery.data.value?.types || [],
    units,
  })

  if (!submitted) {
    return
  }

  Object.assign(newIngredient, submitted)
  await submitIngredient()
}

async function submitIngredient() {
  if (editingIngredientId.value) {
    await saveIngredient({
      id: editingIngredientId.value,
      ...newIngredient,
      typeId: newIngredient.typeId || null,
      calorieAmount: newIngredient.calorieAmount ?? null,
      calories: newIngredient.calories ?? null,
      calorieUnit: newIngredient.defaultUnit || null,
      defaultUnit: newIngredient.defaultUnit || null,
    })

    return
  }

  await addIngredient()
}

async function openType(item?: { id: string
  name: string
  icon: string }) {
  editingTypeId.value = item?.id || null
  Object.assign(newType, item || {
    name: '',
    icon: 'i-lucide-package',
  })

  const submitted = await ingredientTypeFormModal.open({
    editing: Boolean(item),
    initialForm: newType,
  })

  if (!submitted) {
    return
  }

  Object.assign(newType, submitted)
  await submitType()
}

async function submitType() {
  if (editingTypeId.value) {
    await saveType({
      id: editingTypeId.value,
      ...newType,
    })
  }
  else {
    await addType()
  }
}

async function deleteIngredient(item: { id: string
  name: string }) {
  const confirmed = await confirmDeleteModal.open({
    title: 'Delete ingredient?',
    description: `Delete ${item.name}? It must not be used by a recipe.`,
  })

  if (!confirmed) {
    return
  }

  await ingredientMutations.delete.mutateAsync({
    id: item.id,
  })
}

async function deleteSelectedIngredients() {
  const count = selectedIngredientCount.value

  if (count === 0) {
    return
  }

  const confirmed = await confirmDeleteModal.open({
    title: `Delete ${count} ingredients?`,
    description: 'Delete the selected ingredients? They must not be used by a recipe.',
  })

  if (!confirmed) {
    return
  }

  await ingredientMutations.deleteMany.mutateAsync({
    ids: selectedIngredientIds.value,
  })
  clearIngredientSelection()
}

async function deleteType(item: { id: string
  name: string }) {
  const confirmed = await confirmDeleteModal.open({
    title: 'Delete ingredient type?',
    description: `Delete ${item.name}? Existing ingredients will become uncategorised.`,
  })

  if (!confirmed) {
    return
  }

  await typeMutations.delete.mutateAsync({
    id: item.id,
  })
}
</script>

<template>
  <PageShell>
    <PageHeader
      title="Ingredients"
      description="The shared ingredients used to build recipes and future shopping lists."
    >
      <template #actions>
        <UButton
          :label="activeTab === 'ingredients' ? 'New ingredient' : 'New ingredient type'"
          icon="i-lucide-plus"
          @click="activeTab === 'ingredients' ? openNewIngredient() : openType()"
        />
      </template>
    </PageHeader>

    <UTabs
      v-model="activeTab"
      :items="tabs"
      :content="false"
      variant="link"
    />

    <div
      v-if="activeTab === 'ingredients'"
      class="flex flex-col gap-5"
    >
      <div
        class="
          grid gap-4
          sm:grid-cols-[minmax(0,1fr)_auto]
        "
      >
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Search ingredients"
          class="w-full"
        />
        <span class="self-center text-sm text-toned">{{ visibleIngredientCount }} ingredients</span>
      </div>

      <div
        v-if="formDataQuery.isPending.value"
        class="
          grid gap-4
          sm:grid-cols-2
          xl:grid-cols-3
        "
      >
        <USkeleton
          v-for="index in 6"
          :key="index"
          class="h-28"
        />
      </div>
      <UPageCard
        v-else-if="visibleIngredientCount === 0"
        class="border-dashed py-12 text-center"
      >
        <div class="mx-auto flex max-w-sm flex-col items-center gap-3">
          <span
            class="
              grid size-12 place-items-center rounded-xl bg-primary/10
              text-primary
            "
          >
            <UIcon
              name="i-lucide-carrot"
              class="size-6"
            />
          </span>
          <h2 class="font-semibold text-highlighted">
            {{ search ? 'No matching ingredients' : 'Your ingredient library is empty' }}
          </h2>
          <p class="text-sm text-toned">
            Ingredients appear here as you add them while creating recipes.
          </p>
        </div>
      </UPageCard>
      <div
        v-else
        class="flex flex-col gap-8"
      >
        <section
          v-for="group in ingredientGroups"
          :key="group.id"
          class="flex flex-col gap-3"
        >
          <div class="flex items-center gap-2">
            <UIcon
              :name="group.icon"
              class="size-5 text-primary"
            />
            <h2 class="font-semibold text-highlighted">
              {{ group.name }}
            </h2>
            <UBadge
              color="neutral"
              variant="subtle"
              size="sm"
            >
              {{ group.ingredients.length }}
            </UBadge>
          </div>
          <div
            class="
              grid gap-3
              sm:grid-cols-2
              xl:grid-cols-3
            "
          >
            <IngredientCard
              v-for="ingredient in group.ingredients"
              :key="ingredient.id"
              :ingredient="ingredient"
              :selected="selectedIngredientIds.includes(ingredient.id)"
              @edit="openIngredient"
              @delete="deleteIngredient"
              @select="selectIngredient"
            />
          </div>
        </section>
      </div>
    </div>

    <div
      v-if="selectedIngredientCount > 0"
      class="
        fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3
        rounded-xl border border-default bg-elevated px-3 py-2 shadow-xl
      "
    >
      <span class="text-sm font-medium whitespace-nowrap text-highlighted">
        {{ selectedIngredientCount }} selected
      </span>
      <UButton
        label="Clear"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="clearIngredientSelection"
      />
      <UButton
        label="Delete"
        icon="i-lucide-trash-2"
        color="error"
        size="sm"
        @click="deleteSelectedIngredients"
      />
    </div>
    <div
      v-if="activeTab === 'types'"
      class="flex flex-col gap-5"
    >
      <div
        class="
          grid gap-3
          sm:grid-cols-2
          xl:grid-cols-3
        "
      >
        <IngredientTypeCard
          v-for="type in formDataQuery.data.value?.types || []"
          :key="type.id"
          :type="type"
          @edit="openType"
          @delete="deleteType"
        />
      </div>
    </div>
  </PageShell>
</template>
