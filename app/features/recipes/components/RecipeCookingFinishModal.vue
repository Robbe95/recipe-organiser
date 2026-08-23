<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
defineProps<{
  recipeName: string
}>()

const emit = defineEmits<{
  close: [result?: {
    note?: string
  }]
}>()

const note = ref('')

function finish() {
  emit('close', {
    note: note.value.trim() || undefined,
  })
}
</script>

<template>
  <UModal title="Recipe finished">
    <template #body>
      <div class="flex flex-col gap-5">
        <div class="flex flex-col gap-1">
          <p class="font-medium text-highlighted">
            {{ recipeName }} is done.
          </p>
          <p class="text-sm text-toned">
            Add a quick note for next time, if you want.
          </p>
        </div>
        <UTextarea
          v-model="note"
          :rows="4"
          placeholder="e.g. Add more chilli next time"
        />
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="emit('close')"
          />
          <UButton
            label="Finish recipe"
            icon="i-lucide-check"
            @click="finish"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
