<script setup lang="ts">
import { useCreateIngredientMutation } from '~/features/recipes/api/createIngredient.mutation'
import { useCreateRecipeMutation } from '~/features/recipes/api/createRecipe.mutation'
import { useCreateRecipeLabelMutation } from '~/features/recipes/api/createRecipeLabel.mutation'
import { useRecipeQuery } from '~/features/recipes/api/getRecipe.query'
import { useRecipeFormDataQuery } from '~/features/recipes/api/listRecipeFormData.query'
import { useUpdateRecipeMutation } from '~/features/recipes/api/updateRecipe.mutation'
import RecipeEditorHeader from '~/features/recipes/components/RecipeEditorHeader.vue'
import type {
  IngredientRow,
  RecipeForm,
  StepRow,
} from '~/features/recipes/components/recipeEditorTypes'
import RecipeGeneralForm from '~/features/recipes/components/RecipeGeneralForm.vue'
import RecipeIngredientDetailsModal from '~/features/recipes/components/RecipeIngredientDetailsModal.vue'
import RecipeIngredientsForm from '~/features/recipes/components/RecipeIngredientsForm.vue'
import RecipeStepsForm from '~/features/recipes/components/RecipeStepsForm.vue'

const props = defineProps<{
  recipeId?: string
}>()

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
const formDataQuery = useRecipeFormDataQuery()
const createIngredientMutation = useCreateIngredientMutation()
const createRecipeLabelMutation = useCreateRecipeLabelMutation()
const createRecipeMutation = useCreateRecipeMutation()
const updateRecipeMutation = useUpdateRecipeMutation()
const toast = useToast()
const recipeQuery = props.recipeId ? useRecipeQuery(props.recipeId) : null
const isSaving = computed(() => createRecipeMutation.isLoading.value || updateRecipeMutation.isLoading.value)
const saveError = ref('')
const activeTab = ref<'general' | 'ingredients' | 'steps'>('general')
const recipe = reactive<RecipeForm>({
  imageId: null as string | null,
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
  tags: [] as string[],
})
const ingredients = ref<IngredientRow[]>([])
const ingredientSections = ref<string[]>([])
const steps = ref<StepRow[]>([
  newStepRow(),
])

const ingredientOptions = computed(() => formDataQuery.data.value?.ingredients || [])
const cuisineOptions = computed(() => formDataQuery.data.value?.labels
  .filter((label) => label.kind === 'cuisine')
  .map((label) => label.name) || [])
const otherTypeId = computed(() => formDataQuery.data.value?.types.find((type) => type.name === 'Other')?.id || null)
const ingredientTypes = computed(() => formDataQuery.data.value?.types || [])
const sourceOptions = computed(() => formDataQuery.data.value?.labels
  .filter((label) => label.kind === 'source')
  .map((label) => label.name) || [])
const tagOptions = computed(() => formDataQuery.data.value?.labels
  .filter((label) => label.kind === 'tag')
  .map((label) => label.name) || [])
const overlay = useOverlay()
const ingredientDetailsModal = overlay.create(RecipeIngredientDetailsModal)
const estimatedCalories = computed(() => Math.round(ingredients.value.reduce((total, item) => {
  if (!item.amount || item.calories === undefined || !item.calorieAmount || !item.calorieUnit) {
    return total
  }

  const comparableAmount = convertAmount(item.amount, item.unit, item.calorieUnit)

  if (comparableAmount === undefined) {
    return total
  }

  return total + (comparableAmount * item.calories / item.calorieAmount)
}, 0)))

let recipeLoaded = false

watch([
  () => recipeQuery?.data.value,
  ingredientOptions,
], ([
  savedRecipe,
]) => {
  if (!savedRecipe || recipeLoaded) {
    return
  }

  Object.assign(recipe, {
    imageId: savedRecipe.imageId,
    name: savedRecipe.name,
    caloriesOverride: savedRecipe.caloriesOverride ?? undefined,
    cookTimeMinutes: savedRecipe.cookTimeMinutes ?? undefined,
    cuisine: savedRecipe.cuisine || '',
    defaultPortions: savedRecipe.defaultPortions,
    description: savedRecipe.description || '',
    notes: savedRecipe.notes || '',
    prepTimeMinutes: savedRecipe.prepTimeMinutes ?? undefined,
    sourceName: savedRecipe.sourceName || '',
    sourceUrl: savedRecipe.sourceUrl || '',
    tags: savedRecipe.tags,
  })
  ingredients.value = savedRecipe.ingredients.map((item) => {
    const row: IngredientRow = {
      ingredientId: item.ingredientId,
      isOptional: item.isOptional === 1,
      amount: item.amount ?? undefined,
      calorieAmount: undefined,
      calories: undefined,
      calorieUnit: undefined,
      groupName: item.groupName || '',
      note: item.note || '',
      unit: item.unit || '',
    }

    setIngredientDetails(row)

    return row
  })
  ingredientSections.value = savedRecipe.ingredientSections?.length
    ? savedRecipe.ingredientSections
    : [
        ...new Set(savedRecipe.ingredients.flatMap((item) => item.groupName
          ? [
              item.groupName,
            ]
          : [])),
      ]
  steps.value = savedRecipe.steps.map((step) => ({
    clientId: crypto.randomUUID(),
    durationMinutes: step.durationSeconds ? step.durationSeconds / 60 : undefined,
    instruction: step.instruction,
    type: step.type,
  }))
  recipeLoaded = true
}, {
  immediate: true,
})

function convertAmount(amount: number, fromUnit: string, toUnit: string) {
  if (fromUnit === toUnit) {
    return amount
  }

  const conversions: Record<string, number> = {
    g: 1,
    kg: 1000,
    l: 1000,
    ml: 1,
  }
  const fromFactor = conversions[fromUnit]
  const toFactor = conversions[toUnit]

  return fromFactor === undefined || toFactor === undefined
    ? undefined
    : amount * fromFactor / toFactor
}

function newIngredientRow(): IngredientRow {
  return {
    ingredientId: undefined,
    isOptional: false,
    amount: undefined,
    calorieAmount: undefined,
    calories: undefined,
    calorieUnit: undefined,
    groupName: '',
    note: '',
    unit: '',
  }
}

function newStepRow(): StepRow {
  return {
    clientId: crypto.randomUUID(),
    durationMinutes: undefined,
    instruction: '',
    type: 'normal',
  }
}

async function quickAddIngredient(value: string) {
  const parts = value.trim().split(/\s+/)
  const parsedAmount = Number(parts[0])
  const hasAmount = Number.isFinite(parsedAmount)
  const name = (hasAmount ? parts.slice(1) : parts).join(' ')

  if (!name) {
    return
  }

  const row = newIngredientRow()

  row.amount = hasAmount ? parsedAmount : undefined

  const existing = ingredientOptions.value.find((ingredient) => ingredient.name.toLowerCase() === name.toLowerCase())

  if (existing) {
    row.ingredientId = existing.id
    setIngredientDetails(row)
    ingredients.value.push(row)

    return
  }

  if (await createIngredient(name, row)) {
    ingredients.value.push(row)
  }
}

function removeIngredient(row: IngredientRow) {
  ingredients.value = ingredients.value.filter((item) => item !== row)
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

async function setCuisine(value: string) {
  const label = await createRecipeLabelMutation.mutateAsync({
    name: value,
    kind: 'cuisine',
  })

  recipe.cuisine = label.name
}

function clearCuisine() {
  recipe.cuisine = ''
}

async function setSource(value: string) {
  const label = await createRecipeLabelMutation.mutateAsync({
    name: value,
    kind: 'source',
  })

  recipe.sourceName = label.name
}

function clearSource() {
  recipe.sourceName = ''
}

async function addTag(value: string) {
  const label = await createRecipeLabelMutation.mutateAsync({
    name: value,
    kind: 'tag',
  })

  if (!recipe.tags.includes(label.name)) {
    recipe.tags.push(label.name)
  }
}

function removeTag(tag: string) {
  recipe.tags = recipe.tags.filter((value) => value !== tag)
}

function formatIngredientName(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1)
}

async function createIngredient(name: string, row: IngredientRow) {
  const trimmedName = name.trim()

  if (!trimmedName) {
    return false
  }
  const existing = ingredientOptions.value.find((item) => item.name.toLowerCase() === trimmedName.toLowerCase())

  if (existing) {
    row.ingredientId = existing.id
    setIngredientDetails(row)

    return true
  }
  const details = await ingredientDetailsModal.open({
    name: formatIngredientName(trimmedName),
    types: ingredientTypes.value,
    units,
  })

  if (!details) {
    return false
  }

  const created = await createIngredientMutation.mutateAsync({
    ...details,
    typeId: details.typeId || otherTypeId.value,
    calorieAmount: details.calorieAmount ?? null,
    calories: details.calories ?? null,
    calorieUnit: details.defaultUnit || row.unit || null,
    defaultUnit: details.defaultUnit || row.unit || null,
  })

  if (created) {
    row.ingredientId = created.id
    setIngredientDetails(row)

    return true
  }

  return false
}

function setIngredientDetails(row: IngredientRow) {
  const selected = ingredientOptions.value.find((item) => item.id === row.ingredientId)

  if (!selected) {
    return
  }

  row.calories = selected.calories ?? selected.caloriesPer100g ?? undefined
  row.calorieAmount = selected.calorieAmount ?? (selected.caloriesPer100g ? 100 : undefined)
  row.calorieUnit = selected.calorieUnit ?? (selected.caloriesPer100g ? 'g' : undefined)
  row.unit ||= selected.defaultUnit || ''
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
    const recipeInput = {
      imageId: recipe.imageId,
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
        groupName: item.groupName || null,
        note: item.note || null,
        unit: item.unit || null,
      })),
      ingredientSections: ingredientSections.value,
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
      tags: recipe.tags.map((tag) => tag.trim()).filter(Boolean),
    }

    if (props.recipeId) {
      await updateRecipeMutation.mutateAsync({
        ...recipeInput,
        id: props.recipeId,
      })
    }
    else {
      await createRecipeMutation.mutateAsync(recipeInput)
    }

    toast.add({
      title: props.recipeId ? 'Recipe saved' : 'Recipe created',
      color: 'success',
      description: 'Your changes are saved and you can keep editing.',
      icon: 'i-lucide-circle-check',
    })
  }
  catch (error) {
    console.error('Unable to save recipe.', error)
    saveError.value = error instanceof Error && error.message
      ? error.message
      : 'We could not save this recipe. Please try again.'
  }
}
</script>

<template>
  <form
    id="recipe-editor-form"
    class="flex flex-col gap-8"
    @submit.prevent="saveRecipe"
  >
    <RecipeEditorHeader
      v-model:active-tab="activeTab"
      :editing="Boolean(props.recipeId)"
      :loading="isSaving"
    />

    <RecipeGeneralForm
      v-if="activeTab === 'general'"
      v-model:recipe="recipe"
      :cuisine-options="cuisineOptions"
      :estimated-calories="estimatedCalories"
      :source-options="sourceOptions"
      :tag-options="tagOptions"
      @add-tag="addTag"
      @clear-cuisine="clearCuisine"
      @clear-source="clearSource"
      @create-cuisine="setCuisine"
      @create-source="setSource"
      @remove-tag="removeTag"
    />
    <RecipeIngredientsForm
      v-else-if="activeTab === 'ingredients'"
      v-model:ingredients="ingredients"
      v-model:sections="ingredientSections"
      :ingredient-options="ingredientOptions"
      :ingredient-types="ingredientTypes"
      @quick-add="quickAddIngredient"
      @create="createIngredient"
      @remove="removeIngredient"
      @set-details="setIngredientDetails"
    />
    <RecipeStepsForm
      v-else
      v-model:steps="steps"
      @add="addStep"
      @remove="removeStep"
    />

    <!-- Legacy markup retained temporarily while the extracted form tabs settle.
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
      <UFormField
        label="Recipe image"
        hint="Optional"
      >
        <RecipeImageUpload v-model="recipe.imageId" />
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
          <USelectMenu
            v-model="recipe.cuisine"
            :items="cuisineOptions"
            class="w-full"
            create-item="always"
            placeholder="Choose or add a cuisine"
            clear
            @clear="clearCuisine"
            @create="setCuisine"
          />
        </UFormField>
        <UFormField
          label="Tags"
          hint="Optional"
        >
          <USelectMenu
            v-model="recipe.tags"
            :items="tagOptions"
            class="w-full"
            create-item="always"
            placeholder="Choose or add tags"
            multiple
            @create="addTag"
          >
            <template #default>
              <div class="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                <template v-if="recipe.tags.length > 0">
                  <UBadge
                    v-for="tag in recipe.tags"
                    :key="tag"
                    color="neutral"
                    variant="subtle"
                    class="flex items-center gap-1"
                  >
                    {{ tag }}
                    <UButton
                      as="span"
                      icon="i-lucide-x"
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      aria-label="Remove tag"
                      @click.stop="removeTag(tag)"
                    />
                  </UBadge>
                </template>
                <span
                  v-else
                  class="text-dimmed"
                >Choose or add tags</span>
              </div>
            </template>
          </USelectMenu>
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
          <USelectMenu
            v-model="recipe.sourceName"
            :items="sourceOptions"
            class="w-full"
            create-item="always"
            placeholder="Choose or add a source"
            clear
            @clear="clearSource"
            @create="setSource"
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
            <UFormField label="Calories">
              <UInput
                v-model.number="item.calories"
                type="number"
                min="0"
                placeholder="e.g. 144"
                @blur="saveIngredientDetails(item)"
              />
            </UFormField>
            <UFormField :label="`Per ${item.calorieUnit || item.unit || 'unit'}`">
              <UInput
                v-model.number="item.calorieAmount"
                type="number"
                min="0.001"
                step="any"
                placeholder="e.g. 100"
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

    -->
    <p
      v-if="saveError"
      class="text-sm text-error"
    >
      {{ saveError }}
    </p>
  </form>
</template>
