<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import {
  defineSound,
  ensureReady,
} from '@web-kits/audio'
import {
  AnimatePresence,
  Motion,
} from 'motion-v'

import { useCreateIngredientVariantMutation } from '~/features/ingredients/api/createIngredientVariant.mutation'
import IngredientVariantFormModal from '~/features/ingredients/components/IngredientVariantFormModal.vue'
import { useCompleteRecipeCookingMutation } from '~/features/recipes/api/completeRecipeCooking.mutation'
import { useRecipeForCookingQuery } from '~/features/recipes/api/getRecipeForCooking.query'
import RecipeCookingFinishModal from '~/features/recipes/components/RecipeCookingFinishModal.vue'
import RecipeCookingIngredientModal from '~/features/recipes/components/RecipeCookingIngredientModal.vue'

import { formatRecipeInstruction } from '../../../../shared/utils/recipeInstructions'

definePageMeta({
  layout: 'kitchen',
  middleware: 'auth',
  viewTransition: false,
})

const route = useRoute()
const recipeId = computed(() => String(route.params.id))
const mealPlanItemId = computed(() => typeof route.query.mealPlanItemId === 'string'
  ? route.query.mealPlanItemId
  : undefined)
const recipeQuery = useRecipeForCookingQuery(recipeId.value)
const recipe = computed(() => recipeQuery.data.value)
const phase = ref<'complete' | 'ingredients' | 'steps'>('ingredients')
const stepIndex = ref(0)
const completedStepIndexes = ref<number[]>([])
const now = ref(Date.now())
const ingredientsDrawerOpen = ref(false)
const selectedIngredientType = ref<string | null>(null)
const cookingPortions = ref<number | undefined>(undefined)
const hasRestoredCookingSession = ref(false)
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
const cookingInputs = reactive<Record<string, {
  variantId: string
  weight: number | undefined
}>>({})
const activeTimers = ref<Array<{
  id: string
  startedAt: number
  durationSeconds: number
  label: string
  pausedRemaining?: number
}>>([])
const overlay = useOverlay()
const finishRecipeModal = overlay.create(RecipeCookingFinishModal)
const ingredientVariantFormModal = overlay.create(IngredientVariantFormModal)
const cookingIngredientModal = overlay.create(RecipeCookingIngredientModal)
const completeRecipeCookingMutation = useCompleteRecipeCookingMutation()
const createIngredientVariantMutation = useCreateIngredientVariantMutation()
const toast = useToast()
const sessionKey = `recipe-organiser:cooking:${recipeId.value}`
const timerAlert = defineSound({
  envelope: {
    decay: 0.25,
  },
  gain: 0.4,
  source: {
    frequency: {
      end: 880,
      start: 440,
    },
    type: 'sine',
  },
})
let wakeLock: WakeLockSentinel | undefined
let visibilityHandler: (() => void) | undefined

const currentStep = computed(() => recipe.value?.steps[stepIndex.value])
const nextStep = computed(() => recipe.value?.steps[stepIndex.value + 1])
const portionMultiplier = computed(() => {
  const defaultPortions = recipe.value?.defaultPortions || 1
  const portions = cookingPortions.value || defaultPortions

  return portions / defaultPortions
})
const ingredientTypes = computed(() => [
  ...new Map((recipe.value?.ingredients || [])
    .sort((left, right) => left.typeSortOrder - right.typeSortOrder)
    .map((item) => [
      item.type,
      item.type,
    ])).values(),
])
const ingredientSections = computed(() => {
  const ingredients = recipe.value?.ingredients || []
  const savedSections = recipe.value?.ingredientSections || []
  const sectionNames = [
    ...(ingredients.some((item) => !item.groupName)
      ? [
          'Ingredients',
        ]
      : []),
    ...savedSections,
    ...ingredients.flatMap((item) => item.groupName && !savedSections.includes(item.groupName)
      ? [
          item.groupName,
        ]
      : []),
  ]

  return [
    ...new Set(sectionNames),
  ].map((sectionName) => {
    const sectionIngredients = ingredients.filter((item) => sectionName === 'Ingredients'
      ? !item.groupName
      : item.groupName === sectionName)
    const categories = ingredientTypes.value.flatMap((type) => {
      const items = sectionIngredients.filter((item) => item.type === type
        && (!selectedIngredientType.value || item.type === selectedIngredientType.value))

      return items.length > 0
        ? [
            {
              id: type,
              name: type,
              icon: items[0]?.typeIcon || 'i-lucide-package',
              items,
            },
          ]
        : []
    })

    return {
      id: sectionName === 'Ingredients' ? 'default' : sectionName,
      name: sectionName,
      categories,
    }
  }).filter((section) => section.categories.length > 0)
})
const timerCards = computed(() => activeTimers.value.map((timer) => ({
  ...timer,
  paused: timer.pausedRemaining !== undefined,
  remaining: timer.pausedRemaining ?? Math.max(
    0,
    timer.durationSeconds - Math.floor((now.value - timer.startedAt) / 1000),
  ),
})))
const cookingCalories = computed(() => {
  if (!recipe.value) {
    return null
  }

  let total = 0
  let hasNutrition = false

  for (const ingredient of recipe.value.ingredients) {
    const input = cookingInput(ingredient)
    const variant = ingredient.variants.find((item) => item.id === input.variantId)
    const amount = ingredient.requiresWeight ? input.weight : scaledAmount(ingredient.amount)
    const unit = ingredient.requiresWeight ? 'g' : ingredient.unit
    const comparableAmount = convertAmount(amount, unit, variant?.calorieUnit)

    if (comparableAmount === undefined || !variant?.calories || !variant.calorieAmount) {
      continue
    }

    hasNutrition = true
    total += comparableAmount * variant.calories / variant.calorieAmount
  }

  return hasNutrition ? Math.round(total) : null
})
const cookingIngredientUsage = computed(() => recipe.value?.ingredients.map((ingredient) => {
  const input = cookingInput(ingredient)

  return {
    ingredientId: ingredient.ingredientId,
    variantId: input.variantId || undefined,
    weight: ingredient.requiresWeight ? input.weight ?? null : null,
  }
}) || [])

function formatAmount(amount: number | null, unit: string | null) {
  if (amount === null) {
    return unit || ''
  }

  return `${amount} ${unit || ''}`.trim()
}

function scaledAmount(amount: number | null) {
  if (amount === null) {
    return null
  }

  return Math.round(amount * portionMultiplier.value * 100) / 100
}

function convertAmount(
  amount: number | null | undefined,
  fromUnit: string | null | undefined,
  toUnit: string | null | undefined,
) {
  if (amount === null || amount === undefined || !fromUnit || !toUnit) {
    return
  }

  if (fromUnit === toUnit) {
    return amount
  }

  const units: Record<string, {
    factor: number
    type: 'mass' | 'volume'
  }> = {
    g: {
      factor: 1,
      type: 'mass',
    },
    kg: {
      factor: 1000,
      type: 'mass',
    },
    l: {
      factor: 1000,
      type: 'volume',
    },
    ml: {
      factor: 1,
      type: 'volume',
    },
  }
  const from = units[fromUnit]
  const to = units[toUnit]

  if (!from || !to || from.type !== to.type) {
    return
  }

  return amount * from.factor / to.factor
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60

  return `${minutes}:${String(remainder).padStart(2, '0')}`
}

function startCooking() {
  phase.value = 'steps'
  stepIndex.value = 0
  void ensureReady()
  void requestWakeLock()

  if ('Notification' in window && Notification.permission === 'default') {
    void Notification.requestPermission()
  }
}

function persistCookingSession() {
  if (!hasRestoredCookingSession.value) {
    return
  }

  if (phase.value === 'complete') {
    localStorage.removeItem(sessionKey)

    return
  }

  localStorage.setItem(sessionKey, JSON.stringify({
    activeTimers: activeTimers.value,
    completedStepIndexes: completedStepIndexes.value,
    cookingInputs,
    phase: phase.value,
    portions: cookingPortions.value,
    stepIndex: stepIndex.value,
  }))
}

function cookingInput(ingredient: { id: string
  variants: Array<{ id: string
    isDefault?: number }> }) {
  const existing = cookingInputs[ingredient.id]

  if (existing) {
    return existing
  }

  const defaultVariant = ingredient.variants.find((variant) => variant.isDefault) || ingredient.variants[0]
  const created = {
    variantId: defaultVariant?.id || '',
    weight: undefined,
  }

  cookingInputs[ingredient.id] = created

  return created
}

async function addIngredientVariant(ingredient: {
  id: string
  ingredientId: string
  name: string
}) {
  const variant = await ingredientVariantFormModal.open({
    ingredientName: ingredient.name,
    units,
  })

  if (!variant) {
    return
  }

  const created = await createIngredientVariantMutation.mutateAsync({
    ...variant,
    ingredientId: ingredient.ingredientId,
    calorieAmount: variant.calorieAmount ?? null,
    calories: variant.calories ?? null,
    calorieUnit: variant.calorieUnit || null,
  })

  const cookingInputForIngredient = cookingInputs[ingredient.id] || {
    variantId: '',
    weight: undefined,
  }

  cookingInputForIngredient.variantId = created.id
  cookingInputs[ingredient.id] = cookingInputForIngredient
  await recipeQuery.refetch()
}

async function editCookingIngredient(ingredient: {
  id: string
  ingredientId: string
  name: string
  requiresWeight: boolean
  variants: Array<{
    id: string
    name: string
  }>
}) {
  const input = cookingInput(ingredient)
  const result = await cookingIngredientModal.open({
    initialVariantId: input.variantId,
    ingredientName: ingredient.name,
    initialWeight: input.weight,
    requiresWeight: ingredient.requiresWeight,
    variants: ingredient.variants,
  })

  if (!result) {
    return
  }

  if (result.type === 'add-variant') {
    await addIngredientVariant(ingredient)

    return
  }

  input.variantId = result.variantId
  input.weight = result.weight
}

function startTimer() {
  if (!currentStep.value?.durationSeconds || activeTimers.value.some((timer) => timer.id === currentStep.value?.id)) {
    return
  }

  activeTimers.value.push({
    id: currentStep.value.id,
    startedAt: Date.now(),
    durationSeconds: currentStep.value.durationSeconds,
    label: `Step ${stepIndex.value + 1}`,
  })
}

function next() {
  if (!recipe.value || stepIndex.value >= recipe.value.steps.length - 1) {
    return
  }

  completedStepIndexes.value = [
    ...new Set([
      ...completedStepIndexes.value,
      stepIndex.value,
    ]),
  ]
  stepIndex.value += 1
}

function toggleStepComplete(index: number) {
  completedStepIndexes.value = completedStepIndexes.value.includes(index)
    ? completedStepIndexes.value.filter((item) => item !== index)
    : [
        ...completedStepIndexes.value,
        index,
      ]
}

async function requestWakeLock() {
  if (!('wakeLock' in navigator)) {
    return
  }

  wakeLock = await navigator.wakeLock.request('screen')
}

async function finishCooking() {
  if (!recipe.value || completeRecipeCookingMutation.isLoading.value) {
    return
  }

  const result = await finishRecipeModal.open({
    recipeName: recipe.value.name,
  })

  if (!result) {
    return
  }

  const completedRecipe = await completeRecipeCookingMutation.mutateAsync({
    mealPlanItemId: mealPlanItemId.value,
    recipeId: recipe.value.id,
    calories: cookingCalories.value,
    ingredientUsage: cookingIngredientUsage.value,
    note: result.note,
  })

  localStorage.removeItem(sessionKey)
  activeTimers.value = []
  phase.value = 'complete'
  toast.add({
    title: completedRecipe.completedMealPlanItemId
      ? 'Finished and removed from your meal plan'
      : 'Recipe added to your history',
    icon: 'i-lucide-check',
  })
}

function toggleTimer(timerId: string) {
  const timer = activeTimers.value.find((item) => item.id === timerId)

  if (!timer) {
    return
  }

  if (timer.pausedRemaining !== undefined) {
    timer.startedAt = Date.now() - (timer.durationSeconds - timer.pausedRemaining) * 1000
    timer.pausedRemaining = undefined

    return
  }

  timer.pausedRemaining = Math.max(0, timer.durationSeconds - Math.floor((Date.now() - timer.startedAt) / 1000))
}

function removeTimer(timerId: string) {
  activeTimers.value = activeTimers.value.filter((timer) => timer.id !== timerId)
}

function previous() {
  if (stepIndex.value > 0) {
    stepIndex.value -= 1
  }
}

let timerInterval: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  const stored = localStorage.getItem(sessionKey)

  if (stored) {
    try {
      const session = JSON.parse(stored) as {
        activeTimers: typeof activeTimers.value
        completedStepIndexes: number[]
        cookingInputs?: typeof cookingInputs
        phase: typeof phase.value
        portions?: number
        stepIndex: number
      }

      activeTimers.value = session.activeTimers || []
      Object.assign(cookingInputs, session.cookingInputs || {})
      completedStepIndexes.value = session.completedStepIndexes || []
      phase.value = session.phase === 'complete' ? 'ingredients' : session.phase
      cookingPortions.value = session.portions
      stepIndex.value = Math.max(0, session.stepIndex || 0)
    }
    catch {
      localStorage.removeItem(sessionKey)
    }
  }

  hasRestoredCookingSession.value = true
  persistCookingSession()

  visibilityHandler = () => {
    if (document.visibilityState === 'visible' && phase.value === 'steps') {
      void requestWakeLock()
    }
  }
  document.addEventListener('visibilitychange', visibilityHandler)

  timerInterval = setInterval(() => {
    now.value = Date.now()

    timerCards.value.filter((timer) => timer.remaining === 0 && !timer.paused).forEach((timer) => {
      if (activeTimers.value.some((item) => item.id === timer.id)) {
        timerAlert()
        navigator.vibrate?.([
          180,
          100,
          180,
        ])

        if (Notification.permission === 'granted') {
          void new Notification('Timer finished', {
            body: timer.label,
          })
        }

        removeTimer(timer.id)
      }
    })
  }, 1000)
})

watch([
  activeTimers,
  completedStepIndexes,
  cookingInputs,
  phase,
  cookingPortions,
  stepIndex,
], () => {
  persistCookingSession()
}, {
  deep: true,
  flush: 'sync',
})

watch(recipe, (savedRecipe) => {
  if (savedRecipe && !cookingPortions.value) {
    cookingPortions.value = savedRecipe.defaultPortions
  }
}, {
  immediate: true,
})

onBeforeUnmount(() => {
  persistCookingSession()

  if (timerInterval) {
    clearInterval(timerInterval)
  }

  wakeLock?.release()

  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler)
  }
})
</script>

<template>
  <div
    v-if="recipeQuery.isPending.value"
    class="
      mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8
      sm:px-6
    "
  >
    <KitchenLoading
      label="Preheating your recipe"
    />
  </div>
  <UEmpty
    v-else-if="!recipe"
    icon="i-lucide-circle-alert"
    title="Recipe not found"
    description="Choose another recipe to start cooking."
  >
    <template #actions>
      <UButton
        to="/kitchen"
        label="Browse recipes"
      />
    </template>
  </UEmpty>
  <div
    v-else
    class="
      mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-5 px-5 py-4
      sm:px-6
      md:max-w-6xl md:px-8 md:py-6
    "
  >
    <div class="flex items-center justify-between gap-4">
      <UButton
        to="/kitchen"
        aria-label="Back to recipes"
        class="size-10 justify-center rounded-full"
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
      />
      <span
        v-if="phase === 'steps'"
        class="min-w-0 truncate font-semibold text-highlighted"
      >{{ recipe.name }}</span>
      <div
        v-else
        class="flex items-center gap-2 text-sm text-toned"
      >
        <span>Serves</span>
        <UInput
          v-model.number="cookingPortions"
          type="number"
          min="1"
          step="1"
          class="w-18"
          aria-label="Portions"
        />
      </div>
    </div>

    <section
      v-if="phase === 'ingredients'"
      class="flex flex-col gap-6"
    >
      <div
        class="
          overflow-hidden rounded-3xl bg-elevated shadow-sm ring-1 ring-default
        "
      >
        <img
          v-if="recipe.image"
          :src="recipe.image.url"
          :alt="recipe.name"
          class="
            h-48 w-full object-cover
            sm:h-64
          "
        >
        <div
          class="
            flex flex-col gap-3 p-6
            sm:p-8
          "
        >
          <h1
            class="
              text-3xl font-semibold tracking-tight text-highlighted
              sm:text-4xl
            "
          >
            {{ recipe.name }}
          </h1>
          <p
            v-if="recipe.description"
            class="max-w-2xl text-lg text-toned"
          >
            {{ recipe.description }}
          </p>
        </div>
      </div>
      <div class="flex flex-col gap-3">
        <div
          class="
            flex flex-col items-start gap-1
            sm:flex-row sm:items-center sm:justify-between sm:gap-3
          "
        >
          <h2 class="text-xl font-semibold text-highlighted">
            Ingredients
          </h2>
          <span class="text-sm text-toned">Check everything before you start</span>
        </div>
        <div class="flex flex-col gap-4">
          <section
            v-for="section in ingredientSections"
            :key="section.id"
            class="flex flex-col gap-4"
          >
            <h3 class="font-medium text-highlighted">
              {{ section.name }}
            </h3>
            <section
              v-for="category in section.categories"
              :key="category.id"
              class="flex flex-col gap-2"
            >
              <div class="flex items-center gap-2 px-1">
                <UIcon
                  :name="category.icon"
                  class="size-4 text-primary"
                />
                <h4 class="text-sm font-medium text-toned">
                  {{ category.name }}
                </h4>
              </div>
              <div class="overflow-hidden rounded-2xl border border-default">
                <div
                  v-for="ingredient in category.items"
                  :key="ingredient.id"
                  class="
                    flex flex-col gap-3 border-b border-default px-4 py-3
                    last:border-b-0
                  "
                >
                  <div
                    class="
                      flex flex-col gap-3
                      sm:flex-row sm:items-center sm:justify-between sm:gap-4
                    "
                  >
                    <div class="flex min-w-0 items-center gap-3">
                      <span class="size-2 shrink-0 rounded-full bg-primary" />
                      <span
                        :class="ingredient.isOptional ? 'text-toned' : `
                          text-highlighted
                        `"
                      >{{ ingredient.name }}</span>
                      <span
                        v-if="ingredient.isOptional"
                        class="text-xs text-toned"
                      >optional</span>
                    </div>
                    <div
                      class="
                        flex flex-wrap items-center gap-2
                        sm:shrink-0 sm:flex-nowrap
                      "
                    >
                      <span class="font-medium text-highlighted">{{ formatAmount(scaledAmount(ingredient.amount), ingredient.unit) }}</span>
                      <USelectMenu
                        v-if="ingredient.variants.length > 1"
                        v-model="cookingInput(ingredient).variantId"
                        :items="ingredient.variants"
                        value-key="id"
                        label-key="name"
                        class="
                          w-full
                          sm:w-52
                        "
                      />
                      <div
                        v-if="ingredient.requiresWeight"
                        class="flex items-center gap-1"
                      >
                        <UInput
                          v-model.number="cookingInput(ingredient).weight"
                          type="number"
                          min="0"
                          step="any"
                          placeholder="Weight"
                          class="w-28"
                          aria-label="Actual weight in grams"
                        />
                        <span class="text-sm text-toned">g</span>
                      </div>
                      <UButton
                        label="Add variant"
                        icon="i-lucide-plus"
                        color="neutral"
                        variant="ghost"
                        size="sm"
                        @click="addIngredientVariant(ingredient)"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </section>
        </div>
      </div>
      <div
        class="sticky bottom-0 -mx-5 bg-default/90 px-5 py-3 backdrop-blur-xl"
      >
        <UButton
          label="Start cooking"
          icon="i-lucide-chef-hat"
          size="xl"
          class="min-h-13 rounded-2xl"
          block
          @click="startCooking"
        />
      </div>
    </section>

    <section
      v-else-if="phase === 'steps'"
      class="
        grid flex-1 gap-5
        md:grid-cols-[minmax(0,1fr)_18rem]
      "
    >
      <div class="flex min-w-0 flex-col gap-5">
        <div class="flex items-center justify-between gap-3 text-sm text-toned">
          <span>Step {{ stepIndex + 1 }} of {{ recipe.steps.length }}</span>
          <div class="flex items-center gap-2">
            <span
              v-if="cookingCalories !== null"
              class="font-medium text-highlighted"
            >{{ cookingCalories }} kcal total</span>
            <UButton
              label="Ingredients"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="ingredientsDrawerOpen = true"
            />
          </div>
        </div>
        <AnimatePresence mode="popLayout">
          <Motion
            :key="currentStep?.id"
            :initial="{ opacity: 0,
                        y: 16 }"
            :animate="{ opacity: 1,
                        y: 0 }"
            :exit="{ opacity: 0,
                     y: -16 }"
            :transition="{ duration: 0.22,
                           ease: 'easeOut' }"
            class="
              flex flex-2 flex-col justify-between gap-5 rounded-3xl bg-elevated
              p-6 shadow-sm ring-1 ring-default
              sm:min-h-128 sm:p-10
            "
          >
            <div class="flex flex-col gap-5">
              <div class="flex items-center gap-2 text-primary">
                <UIcon
                  name="i-lucide-chef-hat"
                  class="size-5"
                />
                <span class="text-sm font-medium">Current step</span>
              </div>
              <p
                class="
                  max-w-4xl text-xl/8 font-medium wrap-break-word
                  whitespace-pre-line text-highlighted
                  sm:text-4xl/12
                "
              >
                {{ formatRecipeInstruction(currentStep?.instruction || '') }}
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <UButton
                v-if="currentStep?.type === 'timer' && currentStep.durationSeconds"
                :disabled="activeTimers.some((timer) => timer.id === currentStep?.id)"
                :label="activeTimers.some((timer) => timer.id === currentStep?.id) ? 'Timer running' : `Start ${formatTime(currentStep.durationSeconds)} timer`"
                icon="i-lucide-timer"
                class="
                  rounded-full px-4
                  sm:px-5
                "
                @click="startTimer"
              />
              <UButton
                :label="completedStepIndexes.includes(stepIndex) ? 'Completed' : 'Mark complete'"
                :icon="completedStepIndexes.includes(stepIndex) ? 'i-lucide-check' : 'i-lucide-circle-check'"
                color="neutral"
                variant="soft"
                class="
                  rounded-full px-4
                  sm:px-5
                "
                @click="toggleStepComplete(stepIndex)"
              />
            </div>
          </Motion>
        </AnimatePresence>
        <div class="flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            <Motion
              v-if="nextStep"
              :key="nextStep.id"
              :animate="{ opacity: 0.65,
                          y: 0 }"
              :exit="{ opacity: 0,
                       y: -12 }"
              :initial="{ opacity: 0,
                          y: 12 }"
              :transition="{ duration: 0.2,
                             ease: 'easeOut' }"
              class="
                flex min-h-32 flex-1 flex-col justify-center gap-2 rounded-3xl
                bg-elevated/90 p-6 shadow-sm backdrop-blur-sm
              "
            >
              <p class="text-xs font-medium tracking-wide text-toned uppercase">
                Up next
              </p>
              <p
                class="
                  line-clamp-3 text-lg whitespace-pre-line text-highlighted
                "
              >
                {{ formatRecipeInstruction(nextStep.instruction) }}
              </p>
            </Motion>
          </AnimatePresence>
        </div>
        <div
          class="
            sticky bottom-0 z-10 -mx-5 -mb-4 flex flex-col gap-0 bg-default/90
            px-5 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]
            backdrop-blur-xl
            md:static md:mx-0 md:mb-0 md:flex-row md:items-center
            md:justify-between md:bg-transparent md:p-0 md:backdrop-blur-none
          "
        >
          <div
            v-if="timerCards.length > 0"
            class="
              flex flex-col gap-0 border-b border-default py-1
              md:hidden
            "
          >
            <AnimatePresence>
              <Motion
                v-for="timer in timerCards"
                :key="timer.id"
                :animate="{ opacity: 1,
                            y: 0 }"
                :exit="{ opacity: 0,
                         y: -8 }"
                :initial="{ opacity: 0,
                            y: -8 }"
                :transition="{ duration: 0.2,
                               ease: 'easeOut' }"
                class="flex items-center justify-between gap-2 p-1"
              >
                <span class="min-w-0 truncate text-sm text-toned">{{ timer.label }}</span>
                <div class="flex shrink-0 items-center gap-1">
                  <span class="font-semibold text-highlighted tabular-nums">{{ formatTime(timer.remaining) }}</span>
                  <UButton
                    :icon="timer.paused ? 'i-lucide-play' : 'i-lucide-pause'"
                    :aria-label="timer.paused ? 'Resume timer' : 'Pause timer'"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    @click="toggleTimer(timer.id)"
                  />
                  <UButton
                    icon="i-lucide-x"
                    aria-label="Remove timer"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    @click="removeTimer(timer.id)"
                  />
                </div>
              </Motion>
            </AnimatePresence>
          </div>
          <div class="flex w-full items-center gap-3 py-2">
            <UButton
              :disabled="stepIndex === 0"
              label="Back"
              icon="i-lucide-arrow-left"
              color="neutral"
              variant="soft"
              class="min-h-12 rounded-2xl"
              size="lg"
              @click="previous"
            />
            <UButton
              :disabled="completeRecipeCookingMutation.isLoading.value"
              :loading="completeRecipeCookingMutation.isLoading.value"
              :label="stepIndex >= recipe.steps.length - 1 ? 'Finish recipe' : 'Next step'"
              trailing-icon="i-lucide-arrow-right"
              class="min-h-12 flex-1 rounded-2xl"
              size="lg"
              @click="stepIndex >= recipe.steps.length - 1 ? finishCooking() : next()"
            />
          </div>
        </div>
      </div>
      <aside
        class="
          hidden
          md:flex md:flex-col md:gap-3
        "
      >
        <Motion
          class="
            sticky top-20 flex flex-col gap-2 rounded-2xl bg-elevated/50 p-3
          "
          layout
        >
          <p class="text-xs font-medium tracking-wide text-toned uppercase">
            Recipe progress
          </p>
          <Motion
            v-for="(step, index) in recipe.steps"
            :key="step.id"
            :class="index === stepIndex ? 'bg-primary/10 text-primary' : `
              text-toned
              hover:bg-elevated
            `"
            class="flex items-start gap-2 rounded-xl p-2 text-left text-sm"
            layout
            @click="stepIndex = index"
          >
            <span
              class="
                grid size-5 shrink-0 place-items-center rounded-full border
                border-current text-xs
              "
            >{{ completedStepIndexes.includes(index) ? '✓' : index + 1 }}</span>
            <span class="line-clamp-2">{{ step.instruction }}</span>
          </Motion>
          <div
            v-if="timerCards.length > 0"
            class="mt-2 flex flex-col gap-2 border-t border-default pt-3"
          >
            <p class="text-xs font-medium tracking-wide text-toned uppercase">
              Timers
            </p>
            <div
              v-for="timer in timerCards"
              :key="timer.id"
              class="
                flex items-center justify-between rounded-lg bg-elevated px-3
                py-2
              "
            >
              <span class="text-sm text-toned">{{ timer.label }}</span>
              <div class="flex items-center gap-1">
                <span class="font-semibold text-highlighted tabular-nums">{{ formatTime(timer.remaining) }}</span>
                <UButton
                  :icon="timer.paused ? 'i-lucide-play' : 'i-lucide-pause'"
                  :aria-label="timer.paused ? 'Resume timer' : 'Pause timer'"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  @click="toggleTimer(timer.id)"
                />
                <UButton
                  icon="i-lucide-x"
                  aria-label="Remove timer"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  @click="removeTimer(timer.id)"
                />
              </div>
            </div>
          </div>
        </Motion>
      </aside>
    </section>
    <section
      v-else
      class="
        mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center
        gap-5 py-12 text-center
      "
    >
      <span
        class="
          grid size-16 place-items-center rounded-full bg-primary/10
          text-primary
        "
      >
        <UIcon
          name="i-lucide-check"
          class="size-8"
        />
      </span>
      <div class="flex flex-col gap-2">
        <h1 class="text-3xl font-semibold tracking-tight text-highlighted">
          Nicely cooked.
        </h1>
        <p class="text-lg text-toned">
          {{ recipe.name }} has been added to your cooking history.
        </p>
      </div>
      <UButton
        to="/kitchen"
        label="Back to recipes"
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="soft"
      />
    </section>
    <UDrawer
      v-model:open="ingredientsDrawerOpen"
      direction="bottom"
      title="Ingredients"
      description="Everything you need for this recipe."
      class="max-h-[80dvh]"
    >
      <template #body>
        <div class="flex flex-col gap-5">
          <div class="flex gap-2 overflow-x-auto pb-1">
            <UButton
              :color="selectedIngredientType ? 'neutral' : 'primary'"
              :variant="selectedIngredientType ? 'soft' : 'solid'"
              label="All"
              size="sm"
              class="shrink-0 rounded-full"
              @click="selectedIngredientType = null"
            />
            <UButton
              v-for="type in ingredientTypes"
              :key="type"
              :label="type"
              :color="selectedIngredientType === type ? 'primary' : 'neutral'"
              :variant="selectedIngredientType === type ? 'solid' : 'soft'"
              size="sm"
              class="shrink-0 rounded-full"
              @click="selectedIngredientType = type"
            />
          </div>
          <div class="flex flex-col gap-5">
            <section
              v-for="section in ingredientSections"
              :key="section.id"
              class="flex flex-col gap-4"
            >
              <h2 class="font-medium text-highlighted">
                {{ section.name }}
              </h2>
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
                  <h3 class="text-sm font-medium text-toned">
                    {{ category.name }}
                  </h3>
                </div>
                <div class="overflow-hidden rounded-2xl bg-elevated">
                  <div
                    v-for="ingredient in category.items"
                    :key="ingredient.id"
                    class="
                      flex flex-col gap-3 border-b border-default px-4 py-3
                      last:border-b-0
                    "
                  >
                    <div class="flex items-center justify-between gap-4">
                      <div class="flex min-w-0 items-center gap-3">
                        <UIcon
                          :name="ingredient.typeIcon"
                          class="size-4 shrink-0 text-primary"
                        />
                        <span
                          :class="ingredient.isOptional ? 'text-toned' : `
                            text-highlighted
                          `"
                        >
                          {{ ingredient.name }}
                        </span>
                        <span
                          v-if="ingredient.isOptional"
                          class="text-xs text-toned"
                        >optional</span>
                      </div>
                      <div class="flex shrink-0 items-center gap-2">
                        <span class="font-medium text-highlighted">
                          {{ formatAmount(scaledAmount(ingredient.amount), ingredient.unit) }}
                        </span>
                        <UButton
                          label="Edit"
                          icon="i-lucide-pencil"
                          color="neutral"
                          variant="ghost"
                          size="sm"
                          @click="editCookingIngredient(ingredient)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </section>
          </div>
        </div>
      </template>
    </UDrawer>
  </div>
</template>
