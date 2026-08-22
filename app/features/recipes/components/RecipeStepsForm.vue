<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import type { StepRow } from './recipeEditorTypes'

const emit = defineEmits<{
  add: [type?: StepRow['type']]
  remove: [index: number]
}>()
const steps = defineModel<StepRow[]>('steps', {
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
  <section class="flex flex-col gap-4">
    <div class="flex items-end justify-between gap-4">
      <div
        class="flex flex-col gap-1"
      >
        <h2
          class="text-xl font-semibold text-highlighted"
        >
          Steps
        </h2><p
          class="text-sm text-toned"
        >
          Use timers for hands-off cooking, and groups to keep a longer recipe calm.
        </p>
      </div><div
        class="flex items-center gap-2"
      >
        <UButton
          label="Step"
          icon="i-lucide-plus"
          variant="soft"
          @click="emit('add')"
        /><UButton
          label="Timer"
          icon="i-lucide-timer"
          variant="soft"
          @click="emit('add', 'timer')"
        />
      </div>
    </div>
    <div class="flex flex-col gap-3">
      <UCard
        v-for="(step, index) in steps"
        :key="index"
        :ui="{ body: 'p-3 sm:p-4' }"
      >
        <div
          class="flex items-start gap-3"
        >
          <span
            class="
              grid size-8 shrink-0 place-items-center rounded-full bg-muted
              text-sm font-semibold text-toned
            "
          >{{ index + 1 }}</span><div
            class="
              grid min-w-0 flex-1 gap-3
              sm:grid-cols-[150px_minmax(0,1fr)_110px]
            "
          >
            <USelect
              v-model="step.type"
              :items="stepTypes"
              class="w-full"
              value-key="value"
            /><UInput
              v-model="step.instruction"
              :placeholder="step.type === 'group' ? 'e.g. Prepare the vegetables' : 'What needs to happen?'"
            /><UInput
              v-if="step.type === 'timer'"
              v-model.number="step.durationMinutes"
              type="number"
              min="1"
              placeholder="Minutes"
            />
          </div><UButton
            v-if="steps.length > 1"
            icon="i-lucide-trash-2"
            color="neutral"
            variant="ghost"
            aria-label="Remove step"
            @click="emit('remove', index)"
          />
        </div>
      </UCard>
    </div>
  </section>
</template>
