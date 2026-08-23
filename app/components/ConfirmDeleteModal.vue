<script setup lang="ts">
defineProps<{
  title: string
  description: string
  loading?: boolean
}>()

const emit = defineEmits<{
  close: [confirmed: boolean]
}>()
</script>

<template>
  <UModal
    :title="title"
  >
    <template #body>
      <div class="flex flex-col gap-5">
        <p class="text-sm text-toned">
          {{ description }}
        </p>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="emit('close', false)"
          />
          <UButton
            :loading="loading"
            label="Delete"
            color="error"
            icon="i-lucide-trash-2"
            @click="emit('close', true)"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
