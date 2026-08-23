<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import VueDraggable from 'vuedraggable'

import type { StepRow } from './recipeEditorTypes'
import RecipeStepCard from './RecipeStepCard.vue'

const emit = defineEmits<{
  add: [type?: StepRow['type']]
  remove: [index: number]
}>()
const steps = defineModel<StepRow[]>('steps', {
  required: true,
})

function removeStep(step: StepRow) {
  emit('remove', steps.value.indexOf(step))
}
</script>

<template>
  <section class="flex flex-col gap-5">
    <div
      class="
        flex flex-col items-start gap-3
        sm:flex-row sm:items-end sm:justify-between sm:gap-4
      "
    >
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
          Drag to reorder. Add as much detail as you need to each instruction.
        </p>
      </div><div
        class="flex flex-wrap items-center gap-2"
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
    <VueDraggable
      v-model="steps"
      :animation="200"
      item-key="clientId"
      tag="div"
      handle="[data-recipe-step-drag-handle]"
      ghost-class="recipe-step-ghost"
      class="flex flex-col gap-3"
    >
      <template #item="{ element: step, index }">
        <div>
          <RecipeStepCard
            :step="step"
            :index="index"
            @update:step="Object.assign(step, $event)"
            @remove="removeStep(step)"
          />
        </div>
      </template>
    </VueDraggable>
    <UEmpty
      v-if="steps.length === 0"
      icon="i-lucide-list-ordered"
      title="Add the first step"
      description="Start with a simple instruction, then drag it wherever it belongs."
    />
  </section>
</template>

<style scoped>
.recipe-step-ghost {
  opacity: 0.45;
}
</style>
