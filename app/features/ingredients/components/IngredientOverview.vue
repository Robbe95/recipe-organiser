<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import {
  useIngredientTypeMutations,
  useLibraryIngredientMutations,
} from '~/features/ingredients/api/manageIngredients.mutation'
import IngredientTypeIconPicker from '~/features/ingredients/components/IngredientTypeIconPicker.vue'
import { useRecipeFormDataQuery } from '~/features/recipes/api/listRecipeFormData.query'

const formDataQuery = useRecipeFormDataQuery()
const units = [
  'g',
  'kg',
  'ml',
  'l',
  'tsp',
  'tbsp',
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
  caloriesPer100g: undefined as number | undefined,
  defaultUnit: '',
  gramsPerUnit: undefined as number | undefined,
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

async function addIngredient() {
  if (!newIngredient.name.trim()) {
    return
  }

  await ingredientMutations.create.mutateAsync({
    ...newIngredient,
    typeId: newIngredient.typeId || null,
    caloriesPer100g: newIngredient.caloriesPer100g ?? null,
    defaultUnit: newIngredient.defaultUnit || null,
    gramsPerUnit: newIngredient.gramsPerUnit ?? null,
  })
  Object.assign(newIngredient, {
    typeId: '',
    name: '',
    caloriesPer100g: undefined,
    defaultUnit: '',
    gramsPerUnit: undefined,
  })
  ingredientModalOpen.value = false
}

async function saveIngredient(item: { id: string
  typeId: string | null
  name: string
  caloriesPer100g: number | null
  defaultUnit: string | null
  gramsPerUnit: number | null }) {
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
    caloriesPer100g: undefined,
    defaultUnit: '',
    gramsPerUnit: undefined,
  })
  ingredientModalOpen.value = true
}

function openIngredient(item: { id: string
  typeId: string | null
  name: string
  caloriesPer100g: number | null
  defaultUnit: string | null
  gramsPerUnit: number | null }) {
  editingIngredientId.value = item.id
  Object.assign(newIngredient, {
    ...item,
    typeId: item.typeId || '',
    caloriesPer100g: item.caloriesPer100g ?? undefined,
    defaultUnit: item.defaultUnit || '',
    gramsPerUnit: item.gramsPerUnit ?? undefined,
  })
  ingredientModalOpen.value = true
}

async function submitIngredient() {
  if (editingIngredientId.value) {
    await saveIngredient({
      id: editingIngredientId.value,
      ...newIngredient,
      typeId: newIngredient.typeId || null,
      caloriesPer100g: newIngredient.caloriesPer100g ?? null,
      defaultUnit: newIngredient.defaultUnit || null,
      gramsPerUnit: newIngredient.gramsPerUnit ?? null,
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
                    {{ ingredient.defaultUnit || 'No default unit' }} · {{ ingredient.caloriesPer100g ?? '—' }} kcal / 100 g
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

    <UModal
      v-model:open="ingredientModalOpen"
      :title="editingIngredientId ? 'Edit ingredient' : 'New ingredient'"
    >
      <template #body>
        <form
          class="flex flex-col gap-4"
          @submit.prevent="submitIngredient"
        >
          <UFormField
            label="Name"
            required
          >
            <UInput
              v-model="newIngredient.name"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Ingredient type">
            <USelect
              v-model="newIngredient.typeId"
              :items="formDataQuery.data.value?.types || []"
              value-key="id"
              label-key="name"
              class="w-full"
              placeholder="Choose a type"
            />
          </UFormField>
          <div
            class="
              grid gap-4
              sm:grid-cols-2
            "
          >
            <UFormField label="Default unit">
              <USelect
                v-model="newIngredient.defaultUnit"
                :items="units"
                class="w-full"
                placeholder="Choose a unit"
              />
            </UFormField><UFormField label="Calories per 100 g">
              <UInput
                v-model.number="newIngredient.caloriesPer100g"
                class="w-full"
                type="number"
                min="0"
              />
            </UFormField>
          </div>
          <UFormField
            label="Grams per unit"
            hint="Useful for cans and packages"
          >
            <UInput
              v-model.number="newIngredient.gramsPerUnit"
              class="w-full"
              type="number"
              min="0"
            />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="ghost"
              @click="ingredientModalOpen = false"
            /><UButton
              type="submit"
              label="Save ingredient"
              icon="i-lucide-check"
            />
          </div>
        </form>
      </template>
    </UModal>
    <UModal
      v-model:open="typeModalOpen"
      :title="editingTypeId ? 'Edit ingredient type' : 'New ingredient type'"
    >
      <template #body>
        <form
          class="flex flex-col gap-4"
          @submit.prevent="submitType"
        >
          <UFormField
            label="Name"
            required
          >
            <UInput
              v-model="newType.name"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Icon">
            <IngredientTypeIconPicker v-model="newType.icon" />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="ghost"
              @click="typeModalOpen = false"
            /><UButton
              type="submit"
              label="Save type"
              icon="i-lucide-check"
            />
          </div>
        </form>
      </template>
    </UModal>
  </section>
</template>
