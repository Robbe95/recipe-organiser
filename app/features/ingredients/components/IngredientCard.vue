<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import CardActionGroup from '~/components/CardActionGroup.vue'

const props = defineProps<{
  ingredient: {
    id: string
    typeId: string | null
    isPantryStaple: boolean
    name: string
    aliases: string[]
    calorieAmount: number | null
    calories: number | null
    caloriesPer100g: number | null
    calorieUnit: string | null
    defaultUnit: string | null
    requiresWeight: number
    variants: Array<{
      isDefault: number
      name: string
      calorieAmount: number | null
      calories: number | null
      calorieUnit: string | null
    }>
  }
  selected?: boolean
}>()

const emit = defineEmits<{
  delete: [ingredient: typeof props.ingredient]
  edit: [ingredient: typeof props.ingredient]
  select: [event: MouseEvent, ingredient: typeof props.ingredient]
}>()

const calories = computed(() => {
  if (props.ingredient.calories !== null && props.ingredient.calorieAmount !== null && props.ingredient.calorieUnit) {
    return `${props.ingredient.calories} kcal / ${props.ingredient.calorieAmount} ${props.ingredient.calorieUnit}`
  }

  return props.ingredient.caloriesPer100g === null ? 'No calorie information' : `${props.ingredient.caloriesPer100g} kcal / 100 g`
})
</script>

<template>
  <UPageCard
    :class="[
      props.selected ? 'bg-primary/5 ring-2 ring-primary' : `
        hover:bg-elevated/50
      `,
    ]"
    class="cursor-pointer transition-colors"
    @click="emit('select', $event, ingredient)"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex flex-col">
        <h3 class="font-medium text-highlighted">
          {{ ingredient.name }}
        </h3>
        <p
          v-if="ingredient.aliases.length > 0"
          class="text-xs text-muted"
        >
          Also known as {{ ingredient.aliases.join(', ') }}
        </p>
        <p
          class="text-xs text-toned"
        >
          {{ ingredient.defaultUnit || 'No default unit' }} · {{ calories }}
        </p>
        <UBadge
          v-if="ingredient.isPantryStaple"
          color="primary"
          variant="subtle"
          size="xs"
          class="mt-2 w-fit"
        >
          Pantry staple
        </UBadge>
      </div>
      <CardActionGroup
        @click.stop
        @edit="emit('edit', ingredient)"
        @delete="emit('delete', ingredient)"
      />
    </div>
  </UPageCard>
</template>
