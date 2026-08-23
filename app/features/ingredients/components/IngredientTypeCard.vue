<script setup lang="ts">
import CardActionGroup from '~/components/CardActionGroup.vue'

interface IngredientTypeCardItem {
  id: string
  name: string
  icon: string
}

defineProps<{
  type: IngredientTypeCardItem
}>()

const emit = defineEmits<{
  delete: [type: IngredientTypeCardItem]
  edit: [type: IngredientTypeCardItem]
}>()
</script>

<template>
  <UPageCard :ui="{ body: 'p-4' }">
    <div
      class="flex items-center justify-between gap-3"
    >
      <UIcon
        :name="type.icon"
        class="mb-2 size-5 text-primary"
      /><p
        class="mr-auto min-w-0 truncate font-medium text-highlighted"
      >
        {{ type.name }}
      </p>
      <CardActionGroup
        @edit="emit('edit', type)"
        @delete="emit('delete', type)"
      />
    </div>
  </UPageCard>
</template>
