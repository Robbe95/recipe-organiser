<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import type { ImageAspect } from '../lib/crop'

defineProps<{
  readonly error?: string
  readonly fileSelected: boolean
  readonly loading: boolean
  readonly submitLabel: string
}>()

defineEmits<{
  submit: []
}>()

const aspect = defineModel<ImageAspect>('aspect', {
  required: true,
})
const zoom = defineModel<number>('zoom', {
  required: true,
})
</script>

<template>
  <div class="flex flex-col gap-5">
    <UFormField label="Crop shape">
      <USelect
        v-model="aspect"
        :disabled="!fileSelected || loading"
        :items="[
          {
            label: 'Landscape (4:3)',
            value: 'landscape',
          },
          {
            label: 'Square (1:1)',
            value: 'square',
          },
        ]"
        class="w-full"
      />
    </UFormField>
    <UFormField label="Crop zoom">
      <USlider
        v-model="zoom"
        :disabled="!fileSelected || loading"
        :max="3"
        :min="1"
        :step="0.05"
      />
    </UFormField>
    <p class="text-xs/5 text-toned">
      Tap the preview to place the focal point, then use zoom to cut around it.
    </p>
    <UButton
      :disabled="!fileSelected || loading"
      :label="submitLabel"
      :loading="loading"
      icon="i-lucide-wand-sparkles"
      block
      @click="$emit('submit')"
    />
    <UAlert
      v-if="error"
      :description="error"
      color="error"
      icon="i-lucide-circle-alert"
      variant="soft"
    />
  </div>
</template>
