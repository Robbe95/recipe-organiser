<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
defineProps<{
  recipeName: string
}>()

const emit = defineEmits<{
  close: [confirmed: boolean]
}>()
</script>

<template>
  <UModal title="Cancel cooking?">
    <template #body>
      <div class="flex flex-col gap-5">
        <p class="text-sm text-toned">
          Cancel your in-progress {{ recipeName }} session? Its completed steps and running timers will be cleared.
        </p>
        <div class="flex justify-end gap-2">
          <UButton
            label="Keep cooking"
            color="neutral"
            variant="ghost"
            @click="emit('close', false)"
          />
          <UButton
            label="Cancel cooking"
            color="error"
            icon="i-lucide-x"
            @click="emit('close', true)"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
