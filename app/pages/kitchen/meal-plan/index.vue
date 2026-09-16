<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import { useMealPlanQuery } from '~/features/meal-planner/api/listMealPlan.query'
import { useRemoveMealPlanItemMutation } from '~/features/meal-planner/api/removeMealPlanItem.mutation'

definePageMeta({
  layout: 'kitchen',
  middleware: 'auth',
  viewTransition: true,
})

const mealPlanQuery = useMealPlanQuery()
const removeMealPlanItemMutation = useRemoveMealPlanItemMutation()
const mealPlan = computed(() => mealPlanQuery.data.value || [])

async function removeMeal(itemId: string) {
  await removeMealPlanItemMutation.mutateAsync({
    id: itemId,
  })
  await mealPlanQuery.refetch()
}
</script>

<template>
  <div
    class="
      mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 pt-6
      sm:px-6
      md:max-w-6xl md:px-8 md:pt-10
    "
  >
    <div class="flex items-start justify-between gap-4">
      <div class="flex flex-col gap-1">
        <h1
          class="
            text-[2.15rem] leading-none font-bold tracking-tight
            text-highlighted
          "
        >
          Meal plan
        </h1>
        <p class="text-sm text-muted">
          A flexible queue for your next meals.
        </p>
      </div>
      <UButton
        to="/kitchen"
        aria-label="Add meals"
        class="size-11 justify-center rounded-full"
        icon="i-lucide-plus"
      />
    </div>

    <KitchenAsyncState :pending="mealPlanQuery.isPending.value">
      <template #loading>
        <KitchenLoading label="Setting the table" />
      </template>
      <UEmpty
        v-if="mealPlan.length === 0"
        :actions="[{ label: 'Start a meal plan',
                     to: '/kitchen',
                     icon: 'i-lucide-plus' }]"
        icon="i-lucide-calendar-heart"
        title="Your meal plan is empty"
        description="Choose recipes and build a shopping list in one go."
      />
      <div
        v-else
        class="
          flex flex-col gap-3
          md:grid md:grid-cols-2 md:gap-4
        "
      >
        <UPageCard
          v-for="item in mealPlan"
          :key="item.id"
          class="rounded-2xl shadow-sm ring-1 ring-default"
        >
          <div class="flex items-center justify-between gap-4">
            <div class="min-w-0">
              <p class="truncate font-semibold text-highlighted">
                {{ item.recipe.name }}
              </p>
              <p class="text-sm text-muted">
                {{ item.portions }} portions
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-1">
              <UButton
                :to="`/kitchen/recipes/${item.recipeId}?mealPlanItemId=${item.id}`"
                icon="i-lucide-chef-hat"
                label="Cook"
                size="sm"
              />
              <UButton
                :loading="removeMealPlanItemMutation.isLoading.value"
                color="neutral"
                icon="i-lucide-x"
                size="sm"
                variant="ghost"
                aria-label="Remove meal"
                @click="removeMeal(item.id)"
              />
            </div>
          </div>
        </UPageCard>
      </div>
    </KitchenAsyncState>
  </div>
</template>
