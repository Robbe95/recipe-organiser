<script setup lang="ts">
type CardAction = 'delete' | 'edit'

withDefaults(defineProps<{
  actions?: CardAction[]
  deleteLabel?: string
  editLabel?: string
}>(), {
  actions: () => [
    'edit',
    'delete',
  ],
  deleteLabel: 'Delete',
  editLabel: 'Edit',
})

const emit = defineEmits<{
  delete: []
  edit: []
}>()

function trigger(action: CardAction) {
  if (action === 'edit') {
    emit('edit')

    return
  }

  emit('delete')
}
</script>

<template>
  <div class="flex items-center gap-1">
    <UButton
      v-for="action in actions"
      :key="action"
      :icon="action === 'edit' ? 'i-lucide-pencil' : 'i-lucide-trash-2'"
      :color="action === 'delete' ? 'error' : 'neutral'"
      :aria-label="action === 'edit' ? editLabel : deleteLabel"
      variant="ghost"
      @click="trigger(action)"
    />
  </div>
</template>
