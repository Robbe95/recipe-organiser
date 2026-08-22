<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import { useCreateIngredientMutation } from '~/features/recipes/api/createIngredient.mutation'
import { useCreateRecipeMutation } from '~/features/recipes/api/createRecipe.mutation'
import { useRecipeFormDataQuery } from '~/features/recipes/api/listRecipeFormData.query'
import { useUpdateIngredientMutation } from '~/features/recipes/api/updateIngredient.mutation'

interface IngredientRow {
  ingredientId: string | undefined
  isOptional: boolean
  amount: number | undefined
  caloriesPer100g: number | undefined
  gramsPerUnit: number | undefined
  note: string
  unit: string
}
interface StepRow {
  durationMinutes: number | undefined
  instruction: string
  type: 'group' | 'normal' | 'timer'
}

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
const formDataQuery = useRecipeFormDataQuery()
const createIngredientMutation = useCreateIngredientMutation()
const createRecipeMutation = useCreateRecipeMutation()
const updateIngredientMutation = useUpdateIngredientMutation()
const isSaving = computed(() => createRecipeMutation.isLoading.value)
const saveError = ref('')
const activeTab = ref('general')
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
const recipe = reactive({
  name: '',
  caloriesOverride: undefined as number | undefined,
  cookTimeMinutes: undefined as number | undefined,
  cuisine: '',
  defaultPortions: 2,
  description: '',
  notes: '',
  prepTimeMinutes: undefined as number | undefined,
  sourceName: '',
  sourceUrl: '',
  tags: '',
})
const ingredients = ref<IngredientRow[]>([
  newIngredientRow(),
])
const steps = ref<StepRow[]>([
  newStepRow(),
])

const ingredientOptions = computed(() => formDataQuery.data.value?.ingredients || [])
const otherTypeId = computed(() => formDataQuery.data.value?.types.find((type) => type.name === 'Other')?.id || null)
const estimatedCalories = computed(() => Math.round(ingredients.value.reduce((total, item) => {
  if (!item.amount || item.caloriesPer100g === undefined) {
    return total
  }
  let grams = item.amount * (item.gramsPerUnit || 0)

  if (item.unit === 'g') {
    grams = item.amount
  }
  else if (item.unit === 'kg') {
    grams = item.amount * 1000
  }

  return total + (grams * item.caloriesPer100g / 100)
}, 0)))

function newIngredientRow(): IngredientRow {
  return {
    ingredientId: undefined,
    isOptional: false,
    amount: undefined,
    caloriesPer100g: undefined,
    gramsPerUnit: undefined,
    note: '',
    unit: '',
  }
}

function newStepRow(): StepRow {
  return {
    durationMinutes: undefined,
    instruction: '',
    type: 'normal',
  }
}

function addIngredient() {
  ingredients.value.push(newIngredientRow())
}

function removeIngredient(index: number) {
  ingredients.value.splice(index, 1)
}

function addStep(type: StepRow['type'] = 'normal') {
  steps.value.push({
    ...newStepRow(),
    type,
  })
}

function removeStep(index: number) {
  steps.value.splice(index, 1)
}

async function createIngredient(name: string, row: IngredientRow) {
  const trimmedName = name.trim()

  if (!trimmedName) {
    return
  }
  const existing = ingredientOptions.value.find((item) => item.name.toLowerCase() === trimmedName.toLowerCase())

  if (existing) {
    row.ingredientId = existing.id
    setIngredientDetails(row)

    return
  }
  const created = await createIngredientMutation.mutateAsync({
    typeId: otherTypeId.value,
    name: trimmedName,
    defaultUnit: row.unit || null,
  })

  if (created) {
    row.ingredientId = created.id
    setIngredientDetails(row)
  }
}

function setIngredientDetails(row: IngredientRow) {
  const selected = ingredientOptions.value.find((item) => item.id === row.ingredientId)

  if (!selected) {
    return
  }

  row.caloriesPer100g = selected.caloriesPer100g ?? undefined
  row.gramsPerUnit = selected.gramsPerUnit ?? undefined
  row.unit ||= selected.defaultUnit || ''
}

async function saveIngredientDetails(row: IngredientRow) {
  if (!row.ingredientId) {
    return
  }

  await updateIngredientMutation.mutateAsync({
    id: row.ingredientId,
    caloriesPer100g: row.caloriesPer100g ?? null,
    defaultUnit: row.unit || null,
    gramsPerUnit: row.gramsPerUnit ?? null,
  })
}

async function saveRecipe() {
  saveError.value = ''

  if (!recipe.name.trim()) {
    saveError.value = 'Give your recipe a name before saving.'

    return
  }
  const validIngredients = ingredients.value.filter((item) => item.ingredientId)
  const validSteps = steps.value.filter((item) => item.instruction.trim())

  if (validSteps.length === 0) {
    saveError.value = 'Add at least one cooking step.'

    return
  }
  try {
    await createRecipeMutation.mutateAsync({
      name: recipe.name,
      caloriesOverride: recipe.caloriesOverride ?? null,
      cookTimeMinutes: recipe.cookTimeMinutes ?? null,
      cuisine: recipe.cuisine || null,
      defaultPortions: recipe.defaultPortions,
      description: recipe.description || null,
      ingredients: validIngredients.map((item) => ({
        ingredientId: item.ingredientId!,
        isOptional: item.isOptional,
        amount: item.amount ?? null,
        note: item.note || null,
        unit: item.unit || null,
      })),
      notes: recipe.notes || null,
      prepTimeMinutes: recipe.prepTimeMinutes ?? null,
      sourceName: recipe.sourceName || null,
      sourceUrl: recipe.sourceUrl || null,
      steps: validSteps.map((item) => ({
        durationSeconds: item.type === 'timer' && item.durationMinutes
          ? Math.round(item.durationMinutes * 60)
          : null,
        instruction: item.instruction,
        type: item.type,
      })),
      tags: recipe.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    })
    await navigateTo('/dashboard')
  }
  catch {
    saveError.value = 'We could not save this recipe. Please try again.'
  }
}
</script>

<template>
  <form
    class="flex flex-col gap-8"
    @submit.prevent="saveRecipe"
  >
    <div class="flex flex-col gap-2">
      <p class="text-sm font-medium text-primary">
        Your recipe book
      </p>
      <h1 class="text-3xl font-bold tracking-tight text-highlighted">
        Create a recipe
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

    <section
      v-if="activeTab === 'general'"
      class="
        flex flex-col gap-5
        [&_.inline-flex]:w-full
      "
    >
      <div class="flex flex-col gap-1">
        <p class="text-sm font-medium text-primary">
          General details
        </p>
        <p class="text-sm text-toned">
          Everything someone needs to recognise, find, and return to this recipe.
        </p>
      </div>
      <div
        class="
          grid gap-4
          sm:grid-cols-[minmax(0,1fr)_160px]
        "
      >
        <UFormField
          label="Recipe name"
          required
        >
          <UInput
            v-model="recipe.name"
            placeholder="e.g. Crispy tofu bowls"
            size="lg"
          />
        </UFormField>
        <UFormField
          label="Portions"
          required
        >
          <UInput
            v-model.number="recipe.defaultPortions"
            :min="1"
            :max="100"
            type="number"
            size="lg"
          />
        </UFormField>
      </div>
      <UFormField
        label="Description"
        hint="Optional"
      >
        <UTextarea
          v-model="recipe.description"
          :rows="3"
          placeholder="A short note about this recipe…"
        />
      </UFormField>
      <div
        class="
          grid gap-4
          sm:grid-cols-2
        "
      >
        <UFormField
          label="Cuisine"
          hint="Optional"
        >
          <UInput
            v-model="recipe.cuisine"
            placeholder="e.g. Japanese-inspired"
          />
        </UFormField>
        <UFormField
          label="Tags"
          hint="Optional, comma separated"
        >
          <UInput
            v-model="recipe.tags"
            placeholder="weeknight, vegan, freezer-friendly"
          />
        </UFormField>
      </div>
      <div
        class="
          grid gap-4
          sm:grid-cols-2
        "
      >
        <UFormField
          label="Prep time"
          hint="Minutes"
        >
          <UInput
            v-model.number="recipe.prepTimeMinutes"
            type="number"
            min="0"
            placeholder="15"
          />
        </UFormField>
        <UFormField
          label="Cook time"
          hint="Minutes"
        >
          <UInput
            v-model.number="recipe.cookTimeMinutes"
            type="number"
            min="0"
            placeholder="30"
          />
        </UFormField>
      </div>
      <div
        class="
          grid gap-4
          sm:grid-cols-2
        "
      >
        <UFormField
          :hint="`Leave blank to use the ingredient estimate (${estimatedCalories} kcal)`"
          label="Dish calories"
        >
          <UInput
            v-model.number="recipe.caloriesOverride"
            type="number"
            min="0"
            placeholder="Calculated automatically"
          />
        </UFormField>
        <div class="rounded-lg bg-muted/50 px-4 py-3">
          <p class="text-xs font-medium text-toned">
            Estimated calories
          </p>
          <p class="mt-1 text-lg font-semibold text-highlighted">
            {{ estimatedCalories }} kcal
          </p>
          <p class="text-xs text-toned">
            From the ingredient amounts entered.
          </p>
        </div>
      </div>
      <div
        class="
          grid gap-4
          sm:grid-cols-2
        "
      >
        <UFormField
          label="Source"
          hint="Optional"
        >
          <UInput
            v-model="recipe.sourceName"
            placeholder="e.g. Ottolenghi SIMPLE"
          />
        </UFormField>
        <UFormField
          label="Source link"
          hint="Optional"
        >
          <UInput
            v-model="recipe.sourceUrl"
            type="url"
            placeholder="https://…"
          />
        </UFormField>
      </div>
      <UFormField
        label="Personal notes"
        hint="Optional"
      >
        <UTextarea
          v-model="recipe.notes"
          :rows="4"
          placeholder="What would you change next time?"
        />
      </UFormField>
    </section>

    <section
      v-else-if="activeTab === 'ingredients'"
      class="flex flex-col gap-4"
    >
      <div class="flex items-end justify-between gap-4">
        <div class="flex flex-col gap-1">
          <h2 class="text-xl font-semibold text-highlighted">
            Ingredients
          </h2>
          <p class="text-sm text-toned">
            Search your ingredient library, or type a new ingredient to add it.
          </p>
        </div>
        <UButton
          label="Add ingredient"
          icon="i-lucide-plus"
          variant="soft"
          @click="addIngredient"
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
              <USelect
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
                @create="createIngredient($event, item)"
                @update:model-value="setIngredientDetails(item)"
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
            <UFormField
              label="kcal / 100 g"
              hint="Saved to library"
            >
              <UInput
                v-model.number="item.caloriesPer100g"
                type="number"
                min="0"
                placeholder="e.g. 144"
                @blur="saveIngredientDetails(item)"
              />
            </UFormField>
            <UFormField
              label="g per unit"
              hint="For can/package"
            >
              <UInput
                v-model.number="item.gramsPerUnit"
                type="number"
                min="0"
                placeholder="e.g. 400"
                @blur="saveIngredientDetails(item)"
              />
            </UFormField>
            <div class="flex items-center gap-1 pb-0.5">
              <UCheckbox
                v-model="item.isOptional"
                label="Optional"
              />
              <UButton
                v-if="ingredients.length > 1"
                icon="i-lucide-trash-2"
                color="neutral"
                variant="ghost"
                aria-label="Remove ingredient"
                @click="removeIngredient(index)"
              />
            </div>
          </div>
        </UCard>
      </div>
    </section>

    <section
      v-else
      class="flex flex-col gap-4"
    >
      <div class="flex items-end justify-between gap-4">
        <div class="flex flex-col gap-1">
          <h2 class="text-xl font-semibold text-highlighted">
            Steps
          </h2>
          <p class="text-sm text-toned">
            Use timers for hands-off cooking, and groups to keep a longer recipe calm.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            label="Step"
            icon="i-lucide-plus"
            variant="soft"
            @click="addStep()"
          />
          <UButton
            label="Timer"
            icon="i-lucide-timer"
            variant="soft"
            @click="addStep('timer')"
          />
        </div>
      </div>
      <div class="flex flex-col gap-3">
        <UCard
          v-for="(step, index) in steps"
          :key="index"
          :ui="{ body: 'p-3 sm:p-4' }"
        >
          <div class="flex items-start gap-3">
            <span
              class="
                grid size-8 shrink-0 place-items-center rounded-full bg-muted
                text-sm font-semibold text-toned
              "
            >{{ index + 1 }}</span>
            <div
              class="
                grid min-w-0 flex-1 gap-3
                sm:grid-cols-[150px_minmax(0,1fr)_110px]
              "
            >
              <USelect
                v-model="step.type"
                :items="[
                  { label: 'Normal step',
                    value: 'normal' },
                  { label: 'Timed step',
                    value: 'timer' },
                  { label: 'Step group',
                    value: 'group' },
                ]"
                class="w-full"
                value-key="value"
              />
              <UInput
                v-model="step.instruction"
                :placeholder="step.type === 'group' ? 'e.g. Prepare the vegetables' : 'What needs to happen?'"
              />
              <UInput
                v-if="step.type === 'timer'"
                v-model.number="step.durationMinutes"
                type="number"
                min="1"
                placeholder="Minutes"
              />
            </div>
            <UButton
              v-if="steps.length > 1"
              icon="i-lucide-trash-2"
              color="neutral"
              variant="ghost"
              aria-label="Remove step"
              @click="removeStep(index)"
            />
          </div>
        </UCard>
      </div>
    </section>

    <div
      class="flex items-center justify-end gap-3 border-t border-default pt-5"
    >
      <p
        v-if="saveError"
        class="mr-auto text-sm text-error"
      >
        {{ saveError }}
      </p>
      <UButton
        label="Cancel"
        color="neutral"
        variant="ghost"
        to="/dashboard"
      />
      <UButton
        :loading="isSaving"
        type="submit"
        label="Save recipe"
        icon="i-lucide-check"
      />
    </div>
  </form>
</template>
