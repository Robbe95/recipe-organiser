<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
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

  stepIndex.value += 1
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
  timerInterval = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
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
        <div class="flex items-center justify-between gap-3">
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
              flex min-h-88 flex-2 flex-col justify-between gap-5 rounded-4xl
              bg-elevated/70 p-6 shadow-sm
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
                  max-w-4xl text-2xl/9 font-medium text-highlighted
                  sm:text-4xl/12
                "
              >
                {{ currentStep?.instruction }}
              </p>
            </div>
            <UButton
              v-if="currentStep?.type === 'timer' && currentStep.durationSeconds"
              :disabled="activeTimers.some((timer) => timer.id === currentStep?.id)"
              :label="activeTimers.some((timer) => timer.id === currentStep?.id) ? 'Timer running' : `Start ${formatTime(currentStep.durationSeconds)} timer`"
              icon="i-lucide-timer"
              class="self-start rounded-full px-5"
              @click="startTimer"
            />
          </Motion>
        </AnimatePresence>
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
              bg-elevated/50 p-6
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
        <div
          class="
            flex flex-col gap-3
            lg:hidden
          "
        >
          <Motion
            v-if="timerCards.length > 0"
            :animate="{ opacity: 1,
                        y: 0 }"
            :initial="{ opacity: 0,
                        y: -8 }"
            :transition="{ duration: 0.2,
                           ease: 'easeOut' }"
            class="
              flex items-center justify-between rounded-2xl bg-elevated px-4
              py-3 shadow-sm
            "
          >
            <span class="text-sm text-toned">{{ timerCards[0]?.label }}</span>
            <div class="flex items-center gap-1">
              <span class="font-semibold text-highlighted tabular-nums">{{ formatTime(timerCards[0]?.remaining || 0) }}</span>
              <UButton
                :icon="timerCards[0]?.paused ? 'i-lucide-play' : 'i-lucide-pause'"
                :aria-label="timerCards[0]?.paused ? 'Resume timer' : 'Pause timer'"
                color="neutral"
                variant="ghost"
                size="xs"
                @click="timerCards[0] && toggleTimer(timerCards[0].id)"
              />
              <UButton
                icon="i-lucide-x"
                aria-label="Remove timer"
                color="neutral"
                variant="ghost"
                size="xs"
                @click="timerCards[0] && removeTimer(timerCards[0].id)"
              />
            </div>
          </Motion>
        </div>
        <div class="flex items-center justify-between gap-3">
          <UButton
            :disabled="stepIndex === 0"
            label="Back"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="soft"
            @click="previous"
          />
          <UButton
            :disabled="completeRecipeCookingMutation.isLoading.value"
            :loading="completeRecipeCookingMutation.isLoading.value"
            :label="stepIndex >= recipe.steps.length - 1 ? 'Finish recipe' : 'Next step'"
            trailing-icon="i-lucide-arrow-right"
            @click="stepIndex >= recipe.steps.length - 1 ? finishCooking() : next()"
          />
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
            >{{ index + 1 }}</span>
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
