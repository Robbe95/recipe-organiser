<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import PageHeader from '~/components/page/PageHeader.vue'
import PageShell from '~/components/page/PageShell.vue'
import { useMealPlanQuery } from '~/features/meal-planner/api/listMealPlan.query'
import { useRemoveMealPlanItemMutation } from '~/features/meal-planner/api/removeMealPlanItem.mutation'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

const mealPlanQuery = useMealPlanQuery()
const removeMealPlanItemMutation = useRemoveMealPlanItemMutation()
const route = useRoute()
const mealPlan = computed(() => mealPlanQuery.data.value || [])
const isMealPlanIndex = computed(() => route.path === '/meal-plan')

async function removeMeal(itemId: string) {
  await removeMealPlanItemMutation.mutateAsync({
    id: itemId,
  })
  await mealPlanQuery.refetch()
}
</script>

<template>
  <NuxtPage v-if="!isMealPlanIndex" />
  <PageShell v-else>
    <PageHeader
      title="Meal plan"
      description="Your flexible queue of meals to cook next."
    >
      <template #actions>
        <UButton
          to="/meal-plan/new"
          icon="i-lucide-plus"
          label="New meal plan"
        />
      </template>
      <template #primary-action>
        <UButton
          to="/meal-plan/new"
          icon="i-lucide-plus"
          label="New meal plan"
        />
      </template>
    </PageHeader>

    <KitchenLoading
      v-if="mealPlanQuery.isPending.value"
      label="Setting up your meal plan"
    />
    <UEmpty
      v-else-if="mealPlan.length === 0"
      icon="i-lucide-calendar-heart"
      title="No planned meals"
      description="Choose recipes, set portions, and review your shopping list here."
    >
      <template #actions>
        <UButton
          to="/meal-plan/new"
          icon="i-lucide-plus"
          label="Start a meal plan"
        />
      </template>
    </UEmpty>
    <div
      v-else
      class="
        grid gap-4
        md:grid-cols-2
        xl:grid-cols-3
      "
    >
      <UPageCard
        v-for="item in mealPlan"
        :key="item.id"
        class="flex flex-col gap-5"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate text-lg font-semibold text-highlighted">
              {{ item.recipe.name }}
            </p>
            <p class="mt-1 text-sm text-muted">
              {{ item.portions }} portions
            </p>
          </div>
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
        <div class="flex items-center justify-between gap-3">
          <span class="text-sm text-muted">Ready when you are</span>
          <UButton
            :to="`/kitchen/recipes/${item.recipeId}?mealPlanItemId=${item.id}`"
            icon="i-lucide-chef-hat"
            label="Cook"
            size="sm"
          />
        </div>
      </UPageCard>
    </div>
  </PageShell>
</template>
