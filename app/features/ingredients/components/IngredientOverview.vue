<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import {
  useIngredientTypeMutations,
  useLibraryIngredientMutations,
} from '~/features/ingredients/api/manageIngredients.mutation'
import IngredientFormModal from '~/features/ingredients/components/IngredientFormModal.vue'
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
const ingredientModalOpen = ref(false)
const typeModalOpen = ref(false)
const editingIngredientId = ref<string | null>(null)
const editingTypeId = ref<string | null>(null)
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

function formatCalories(ingredient: {
  calorieAmount: number | null
  calories: number | null
  caloriesPer100g: number | null
  calorieUnit: string | null
}) {
  if (ingredient.calories !== null && ingredient.calorieAmount !== null && ingredient.calorieUnit) {
    return `${ingredient.calories} kcal / ${ingredient.calorieAmount} ${ingredient.calorieUnit}`
  }

  return ingredient.caloriesPer100g === null ? 'No calorie information' : `${ingredient.caloriesPer100g} kcal / 100 g`
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
  ingredientModalOpen.value = false
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

function openNewIngredient() {
  editingIngredientId.value = null
  Object.assign(newIngredient, {
    typeId: '',
    name: '',
    calorieAmount: undefined,
    calories: undefined,
    defaultUnit: '',
  })
  ingredientModalOpen.value = true
}

function openIngredient(item: { id: string
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
  ingredientModalOpen.value = true
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
    ingredientModalOpen.value = false

    return
  }

  await addIngredient()
}

function openType(item?: { id: string
  name: string
  icon: string }) {
  editingTypeId.value = item?.id || null
  Object.assign(newType, item || {
    name: '',
    icon: 'i-lucide-package',
  })
  typeModalOpen.value = true
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

  typeModalOpen.value = false
}
</script>

<template>
  <section
    class="
      flex w-full flex-col gap-7 py-4
      sm:py-8
    "
  >
    <div
      class="
        flex flex-col justify-between gap-4
        sm:flex-row sm:items-end
      "
    >
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-2 text-sm font-medium text-primary">
          <UIcon
            name="i-lucide-shopping-basket"
            class="size-4"
          />
          Ingredient library
        </div>
        <div class="flex flex-col gap-1">
          <h1 class="text-3xl font-bold tracking-tight text-highlighted">
            Ingredients
          </h1>
          <p class="text-sm text-toned">
            The shared ingredients used to build recipes and future shopping lists.
          </p>
        </div>
      </div>
      <UButton
        :label="activeTab === 'ingredients' ? 'New ingredient' : 'New ingredient type'"
        icon="i-lucide-plus"
        @click="activeTab === 'ingredients' ? openNewIngredient() : openType()"
      />
    </div>

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
            <UPageCard
              v-for="ingredient in group.ingredients"
              :key="ingredient.id"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="flex flex-col gap-1">
                  <h3 class="font-medium text-highlighted">
                    {{ ingredient.name }}
                  </h3>
                  <p class="text-sm text-toned">
                    {{ ingredient.defaultUnit || 'No default unit' }} · {{ formatCalories(ingredient) }}
                  </p>
                </div>
                <UButton
                  label="Edit"
                  icon="i-lucide-pencil"
                  color="neutral"
                  variant="soft"
                  aria-label="Save ingredient"
                  @click="openIngredient(ingredient)"
                />
              </div>
            </UPageCard>
          </div>
        </section>
      </div>
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
        <UPageCard
          v-for="type in formDataQuery.data.value?.types || []"
          :key="type.id"
          :ui="{ body: 'p-4' }"
        >
          <div class="flex items-center justify-between gap-3">
            <UIcon
              :name="type.icon"
              class="mb-2 size-5 text-primary"
            />
            <p class="mr-auto font-medium text-highlighted">
              {{ type.name }}
            </p>
            <UButton
              icon="i-lucide-pencil"
              color="neutral"
              variant="soft"
              aria-label="Save type"
              @click="openType(type)"
            />
          </div>
        </UPageCard>
      </div>
    </div>

    <IngredientFormModal
      v-model:open="ingredientModalOpen"
      v-model:form="newIngredient"
      :editing="Boolean(editingIngredientId)"
      :types="formDataQuery.data.value?.types || []"
      :units="units"
      @submit="submitIngredient"
    />
    <IngredientTypeFormModal
      v-model:open="typeModalOpen"
      v-model:form="newType"
      :editing="Boolean(editingTypeId)"
      @submit="submitType"
    />
  </section>
</template>
