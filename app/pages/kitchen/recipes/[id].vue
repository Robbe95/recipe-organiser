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

import { useCompleteRecipeCookingMutation } from '~/features/recipes/api/completeRecipeCooking.mutation'
import { useRecipeForCookingQuery } from '~/features/recipes/api/getRecipeForCooking.query'
import RecipeCookingFinishModal from '~/features/recipes/components/RecipeCookingFinishModal.vue'

definePageMeta({
  layout: 'kitchen',
})

const route = useRoute()
const recipeId = computed(() => String(route.params.id))
const recipeQuery = useRecipeForCookingQuery(recipeId.value)
const recipe = computed(() => recipeQuery.data.value)
const phase = ref<'complete' | 'ingredients' | 'steps'>('ingredients')
const stepIndex = ref(0)
const completedStepIndexes = ref<number[]>([])
const now = ref(Date.now())
const ingredientsDrawerOpen = ref(false)
const selectedIngredientType = ref<string | null>(null)
const activeTimers = ref<Array<{
  id: string
  startedAt: number
  durationSeconds: number
  label: string
  pausedRemaining?: number
}>>([])
const overlay = useOverlay()
const finishRecipeModal = overlay.create(RecipeCookingFinishModal)
const completeRecipeCookingMutation = useCompleteRecipeCookingMutation()
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
const ingredientTypes = computed(() => [
  ...new Set(recipe.value?.ingredients.map((item) => item.type) || []),
])
const allIngredientGroups = computed(() => {
  const ingredients = recipe.value?.ingredients || []

  return [
    ...new Map(ingredientTypes.value.map((type) => [
      type,
      ingredients.filter((item) => item.type === type),
    ])).entries(),
  ].filter(([
    ,
    items,
  ]) => items.length > 0)
})
const ingredientGroups = computed(() => selectedIngredientType.value
  ? allIngredientGroups.value.filter(([
      type,
    ]) => type === selectedIngredientType.value)
  : allIngredientGroups.value)
const timerCards = computed(() => activeTimers.value.map((timer) => ({
  ...timer,
  paused: timer.pausedRemaining !== undefined,
  remaining: timer.pausedRemaining ?? Math.max(
    0,
    timer.durationSeconds - Math.floor((now.value - timer.startedAt) / 1000),
  ),
})))

function formatAmount(amount: number | null, unit: string | null) {
  if (amount === null) {
    return unit || ''
  }

  return `${amount} ${unit || ''}`.trim()
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

  await completeRecipeCookingMutation.mutateAsync({
    recipeId: recipe.value.id,
    note: result.note,
  })
  localStorage.removeItem(sessionKey)
  activeTimers.value = []
  phase.value = 'complete'
  toast.add({
    title: 'Recipe added to your history',
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
        phase: typeof phase.value
        stepIndex: number
      }

      activeTimers.value = session.activeTimers || []
      completedStepIndexes.value = session.completedStepIndexes || []
      phase.value = session.phase === 'complete' ? 'ingredients' : session.phase
      stepIndex.value = Math.max(0, session.stepIndex || 0)
    }
    catch {
      localStorage.removeItem(sessionKey)
    }
  }

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
  phase,
  stepIndex,
], () => {
  if (phase.value === 'complete') {
    localStorage.removeItem(sessionKey)

    return
  }

  localStorage.setItem(sessionKey, JSON.stringify({
    activeTimers: activeTimers.value,
    completedStepIndexes: completedStepIndexes.value,
    phase: phase.value,
    stepIndex: stepIndex.value,
  }))
}, {
  deep: true,
})

onBeforeUnmount(() => {
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
    <USkeleton class="h-12 w-64" />
    <USkeleton class="h-80 rounded-2xl" />
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
      mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-7xl flex-col gap-6
      px-4 py-6
      sm:px-6 sm:py-8
    "
  >
    <div class="flex items-center justify-between gap-4">
      <UButton
        to="/kitchen"
        label="Recipes"
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
      />
      <span class="text-sm text-toned">{{ recipe.defaultPortions }} portions</span>
    </div>

    <section
      v-if="phase === 'ingredients'"
      class="flex flex-col gap-6"
    >
      <div class="overflow-hidden rounded-2xl bg-elevated">
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
            v-for="[type, ingredients] in allIngredientGroups"
            :key="type"
            class="flex flex-col gap-2"
          >
            <div class="flex items-center gap-2 px-1">
              <UIcon
                :name="ingredients[0]?.typeIcon || 'i-lucide-package'"
                class="size-4 text-primary"
              />
              <h3 class="text-sm font-medium text-toned">
                {{ type }}
              </h3>
            </div>
            <div class="overflow-hidden rounded-2xl border border-default">
              <div
                v-for="ingredient in ingredients"
                :key="ingredient.id"
                class="
                  flex items-center justify-between gap-4 border-b
                  border-default px-4 py-3
                  last:border-b-0
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
                <span class="shrink-0 font-medium text-highlighted">{{ formatAmount(ingredient.amount, ingredient.unit) }}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
      <UButton
        label="Start cooking"
        icon="i-lucide-chef-hat"
        size="xl"
        class="self-start"
        @click="startCooking"
      />
    </section>

    <section
      v-else-if="phase === 'steps'"
      class="
        grid flex-1 gap-5
        lg:grid-cols-[minmax(0,1fr)_18rem]
      "
    >
      <div class="flex min-w-0 flex-col gap-5">
        <div class="flex items-center justify-between gap-3 text-sm text-toned">
          <span>Step {{ stepIndex + 1 }} of {{ recipe.steps.length }}</span>
          <UButton
            label="Ingredients"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="ingredientsDrawerOpen = true"
          />
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
              flex flex-2 flex-col justify-between gap-5 rounded-4xl
              bg-elevated/70 p-5 shadow-sm
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
                  text-highlighted
                  sm:text-4xl/12
                "
              >
                {{ currentStep?.instruction }}
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
              <p class="line-clamp-3 text-lg text-highlighted">
                {{ nextStep.instruction }}
              </p>
            </Motion>
          </AnimatePresence>
        </div>
        <div
          class="
            sticky bottom-0 z-10 -mx-4 -mb-6 flex flex-col gap-0 bg-default/95
            px-4 backdrop-blur-sm
            sm:-mb-8
            lg:static lg:mx-0 lg:mb-0 lg:flex-row lg:items-center
            lg:justify-between lg:bg-transparent lg:p-0 lg:backdrop-blur-none
          "
        >
          <div
            v-if="timerCards.length > 0"
            class="
              flex flex-col gap-0 border-b border-default py-1
              lg:hidden
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
          <div class="flex w-full items-center justify-between gap-3 py-2">
            <UButton
              :disabled="stepIndex === 0"
              label="Back"
              icon="i-lucide-arrow-left"
              color="neutral"
              variant="soft"
              size="sm"
              @click="previous"
            />
            <UButton
              :disabled="completeRecipeCookingMutation.isLoading.value"
              :loading="completeRecipeCookingMutation.isLoading.value"
              :label="stepIndex >= recipe.steps.length - 1 ? 'Finish recipe' : 'Next step'"
              trailing-icon="i-lucide-arrow-right"
              size="sm"
              @click="stepIndex >= recipe.steps.length - 1 ? finishCooking() : next()"
            />
          </div>
        </div>
      </div>
      <aside
        class="
          hidden
          lg:flex lg:flex-col lg:gap-3
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
              v-for="[type, ingredients] in ingredientGroups"
              :key="type"
              class="flex flex-col gap-2"
            >
              <h2 class="text-sm font-medium text-toned">
                {{ type }}
              </h2>
              <div class="overflow-hidden rounded-2xl bg-elevated">
                <div
                  v-for="ingredient in ingredients"
                  :key="ingredient.id"
                  class="
                    flex items-center justify-between gap-4 border-b
                    border-default px-4 py-3
                    last:border-b-0
                  "
                >
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
                  <span class="shrink-0 font-medium text-highlighted">
                    {{ formatAmount(ingredient.amount, ingredient.unit) }}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </template>
    </UDrawer>
  </div>
</template>
