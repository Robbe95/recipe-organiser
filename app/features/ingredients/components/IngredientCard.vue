<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import CardActionGroup from '~/components/CardActionGroup.vue'

const props = defineProps<{
  ingredient: {
    id: string
    typeId: string | null
    name: string
    calorieAmount: number | null
    calories: number | null
    caloriesPer100g: number | null
    calorieUnit: string | null
    defaultUnit: string | null
  }
}>()

const emit = defineEmits<{
  delete: [ingredient: typeof props.ingredient]
  edit: [ingredient: typeof props.ingredient]
}>()

const calories = computed(() => {
  if (props.ingredient.calories !== null && props.ingredient.calorieAmount !== null && props.ingredient.calorieUnit) {
    return `${props.ingredient.calories} kcal / ${props.ingredient.calorieAmount} ${props.ingredient.calorieUnit}`
  }

  return props.ingredient.caloriesPer100g === null ? 'No calorie information' : `${props.ingredient.caloriesPer100g} kcal / 100 g`
})
</script>

<template>
  <UPageCard>
    <div class="flex items-start justify-between gap-3">
      <div class="flex flex-col">
        <h3 class="font-medium text-highlighted">
          {{ ingredient.name }}
        </h3>
        <p
          class="text-xs text-toned"
        >
          {{ ingredient.defaultUnit || 'No default unit' }} · {{ calories }}
        </p>
      </div>
      <CardActionGroup
        @edit="emit('edit', ingredient)"
        @delete="emit('delete', ingredient)"
      />
    </div>
  </UPageCard>
</template>
