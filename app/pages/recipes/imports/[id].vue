<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import { useFinalizeRecipeImportMutation } from '~/features/recipes/api/finalizeRecipeImport.mutation'
import { useRecipeImportQuery } from '~/features/recipes/api/getRecipeImport.query'
import { useRecipeFormDataQuery } from '~/features/recipes/api/listRecipeFormData.query'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

const route = useRoute()
const id = String(route.params.id)
const importQuery = useRecipeImportQuery(id)
const finalizeMutation = useFinalizeRecipeImportMutation()
const formDataQuery = useRecipeFormDataQuery()
const draft = ref<Record<string, any> | null>(null)
const activeTab = ref<'general' | 'ingredients' | 'steps'>('general')
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

function formatIngredientName(value: string) {
  const normalized = value.trim().toLocaleLowerCase()

  return `${normalized[0]?.toLocaleUpperCase()}${normalized.slice(1)}`
}

function ingredientLibraryKey(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => {
      if (word.endsWith('ies')) {
        return `${word.slice(0, -3)}y`
      }
      if (word.endsWith('oes')) {
        return `${word.slice(0, -2)}`
      }
      if (/(?:ches|shes|sses|xes|zes)$/.test(word)) {
        return word.slice(0, -2)
      }
      if (word.endsWith('s') && !/(?:ss|us|is)$/.test(word)) {
        return word.slice(0, -1)
      }

      return word
    })
    .join(' ')
}

const existingIngredientNames = computed(() => new Set(
  (formDataQuery.data.value?.ingredients || []).map((item) => ingredientLibraryKey(item.name)),
))

function isExistingIngredient(name: string) {
  return existingIngredientNames.value.has(ingredientLibraryKey(name))
}

const newIngredientCount = computed(() => draft.value?.ingredients.filter(
  (ingredient: { name: string }) => !isExistingIngredient(ingredient.name),
).length || 0)

watch(() => importQuery.data.value?.draft, (value) => {
  if (value && !draft.value) {
    draft.value = structuredClone(value as Record<string, any>)
    draft.value.ingredients = draft.value.ingredients.map((ingredient: { name: string }) => ({
      ...ingredient,
      name: formatIngredientName(ingredient.name),
    }))
  }
}, {
  immediate: true,
})

async function saveDraft() {
  if (!draft.value) {
    return
  }

  const recipe = await finalizeMutation.mutateAsync({
    id,
    draft: draft.value,
  })

  await navigateTo(`/recipes/${recipe.id}/edit`)
}
</script>

<template>
  <PageShell>
    <PageHeader
      title="Review imported recipe"
      description="Tweak the draft before it creates recipes and ingredients in your library."
    >
      <template #actions>
        <UButton
          :loading="finalizeMutation.isLoading.value"
          label="Add recipe to library"
          icon="i-lucide-check"
          @click="saveDraft"
        />
      </template>
    </PageHeader>
    <AppQueryState :query="importQuery">
      <template #default>
        <div
          v-if="draft"
          class="flex flex-col gap-6"
        >
          <UTabs
            v-model="activeTab"
            :content="false"
            :items="[
              { label: 'General',
                value: 'general',
                icon: 'i-lucide-notebook-pen' },
              { label: 'Ingredients',
                value: 'ingredients',
                icon: 'i-lucide-shopping-basket',
                badge: newIngredientCount || undefined },
              { label: 'Steps',
                value: 'steps',
                icon: 'i-lucide-list-ordered' },
            ]"
            variant="link"
          />
          <template v-if="activeTab === 'general'">
            <UFormField label="Recipe name">
              <UInput
                v-model="draft.name"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Description">
              <UTextarea
                v-model="draft.description"
                :rows="3"
                class="w-full"
              />
            </UFormField>
          </template>
          <template v-else-if="activeTab === 'ingredients'">
            <div
              class="
                flex flex-col items-start gap-2
                sm:flex-row sm:items-center sm:justify-between sm:gap-3
              "
            >
              <h2 class="font-semibold text-highlighted">
                Ingredients
              </h2>
              <UBadge
                color="primary"
                variant="subtle"
              >
                {{ newIngredientCount }} new to your library
              </UBadge>
            </div>
            <p class="text-sm text-toned">
              New ingredients use a Generic variant. Check its nutrition and whether cooking needs an actual weight.
            </p>
            <div class="flex flex-col gap-3">
              <UCard
                v-for="(ingredient, index) in draft.ingredients"
                :key="index"
                :class="isExistingIngredient(ingredient.name) ? '' : `
                  border-primary/50 bg-primary/5
                `"
                :ui="{ body: 'p-3' }"
              >
                <div
                  v-if="!isExistingIngredient(ingredient.name)"
                  class="
                    mb-2 flex items-center gap-1 text-xs font-medium
                    text-primary
                  "
                >
                  <UIcon name="i-lucide-sparkles" /> New ingredient
                </div>
                <div class="flex flex-col gap-4">
                  <div
                    class="
                      grid gap-2
                      sm:grid-cols-[minmax(0,1fr)_8rem_8rem]
                    "
                  >
                    <UInput v-model="ingredient.name" />
                    <UInput
                      v-model.number="ingredient.amount"
                      type="number"
                      placeholder="Amount"
                    />
                    <USelectMenu
                      v-model="ingredient.unit"
                      :items="units"
                      class="w-full"
                      placeholder="Unit"
                    />
                  </div>
                  <UInput
                    v-model="ingredient.groupName"
                    icon="i-lucide-list-tree"
                    placeholder="Ingredient section (optional)"
                  />

                  <div class="rounded-lg bg-elevated/50 p-3">
                    <div class="mb-3 flex items-center justify-between gap-3">
                      <div class="flex items-center gap-2">
                        <UIcon
                          name="i-lucide-scan-barcode"
                          class="size-4 text-primary"
                        />
                        <p class="text-sm font-medium text-highlighted">
                          Generic nutrition
                        </p>
                      </div>
                      <UCheckbox
                        v-model="ingredient.requiresWeight"
                        label="Ask for actual weight"
                      />
                    </div>
                    <div
                      class="
                        grid gap-2
                        sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_8rem]
                      "
                    >
                      <UInput
                        v-model.number="ingredient.calories"
                        type="number"
                        min="0"
                        placeholder="kcal"
                      />
                      <span class="self-center text-sm text-toned">kcal per</span>
                      <UInput
                        v-model.number="ingredient.calorieAmount"
                        type="number"
                        min="0.001"
                        step="any"
                        placeholder="100"
                      />
                      <USelectMenu
                        v-model="ingredient.nutritionUnit"
                        :items="units"
                        class="w-full"
                        placeholder="Unit"
                        @update:model-value="ingredient.defaultUnit = $event"
                      />
                    </div>
                  </div>
                </div>
              </UCard>
            </div>
          </template>
          <template v-else>
            <div class="flex flex-col gap-3">
              <h2 class="font-semibold text-highlighted">
                Steps
              </h2>
              <UCard
                v-for="(step, index) in draft.steps"
                :key="index"
                :ui="{ body: 'p-3' }"
              >
                <UTextarea
                  v-model="step.instruction"
                  :rows="3"
                  class="w-full"
                />
              </UCard>
            </div>
          </template>
        </div>
      </template>
    </AppQueryState>
  </PageShell>
</template>
