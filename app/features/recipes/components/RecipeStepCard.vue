<script setup lang="ts">
import type { StepRow } from './recipeEditorTypes'

defineProps<{
  index: number
}>()

const emit = defineEmits<{
  remove: []
}>()
const step = defineModel<StepRow>('step', {
  required: true,
})
const stepTypes = [
  {
    label: 'Normal step',
    value: 'normal',
  },
  {
    label: 'Timed step',
    value: 'timer',
  },
  {
    label: 'Step group',
    value: 'group',
  },
]
</script>

<template>
  <UCard :ui="{ body: 'p-3 sm:p-4' }">
    <div class="flex items-start gap-3">
      <div class="flex flex-col items-center gap-1">
        <UButton
          class="cursor-grab"
          icon="i-lucide-grip-vertical"
          color="neutral"
          variant="ghost"
          aria-label="Reorder step"
          data-recipe-step-drag-handle
        />
      </div>
      <div class="flex min-w-0 flex-1 flex-col gap-3">
        <div
          class="flex flex-wrap items-center gap-2"
        >
          <USelect
            v-model="step.type"
            :items="stepTypes"
            class="w-36"
            value-key="value"
          /><UInput
            v-if="step.type === 'timer'"
            v-model.number="step.durationMinutes"
            class="w-28"
            type="number"
            min="1"
            placeholder="Minutes"
          />
        </div><UTextarea
          v-model="step.instruction"
          :rows="2"
          :placeholder="step.type === 'group' ? 'e.g. Prepare the vegetables' : 'Describe this step in as much detail as needed…'"
          autoresize
        />
      </div>
      <UButton
        icon="i-lucide-trash-2"
        color="neutral"
        variant="ghost"
        aria-label="Remove step"
        @click="emit('remove')"
      />
    </div>
  </UCard>
</template>
