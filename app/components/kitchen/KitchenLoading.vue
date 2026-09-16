<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import { Motion } from 'motion-v'

withDefaults(defineProps<{
  label?: string
}>(), {
  label: 'Getting things ready',
})
</script>

<template>
  <Motion
    :animate="{ opacity: 1,
                y: 0 }"
    :initial="{ opacity: 0,
                y: 10 }"
    :transition="{ duration: 0.32,
                   ease: [0.22, 1, 0.36, 1] }"
    aria-busy="true"
    aria-live="polite"
    class="
      flex min-h-52 flex-col items-center justify-center gap-4 py-8 text-center
    "
    role="status"
  >
    <div class="relative grid size-16 place-items-center">
      <Motion
        :animate="{ rotate: [-3, 3, -3],
                    y: [0, -2, 0] }"
        :transition="{ duration: 1.8,
                       ease: 'easeInOut',
                       repeat: Infinity }"
        class="
          grid size-14 place-items-center rounded-[1.35rem] bg-primary/10
          text-primary ring-1 ring-primary/15
        "
      >
        <UIcon
          name="i-lucide-cooking-pot"
          class="size-7"
        />
      </Motion>
      <Motion
        :animate="{ opacity: [0, 0.8, 0],
                    y: [2, -7, -10],
                    scaleY: [0.7, 1, 0.75] }"
        :transition="{ duration: 1.45,
                       ease: 'easeOut',
                       repeat: Infinity }"
        class="
          absolute top-0 left-[1.55rem] h-2 w-0.5 rounded-full bg-primary/70
        "
      />
      <Motion
        :animate="{ opacity: [0, 0.7, 0],
                    y: [2, -6, -9],
                    scaleY: [0.7, 1, 0.75] }"
        :transition="{ delay: 0.42,
                       duration: 1.45,
                       ease: 'easeOut',
                       repeat: Infinity }"
        class="
          absolute top-1 right-[1.45rem] h-2 w-0.5 rounded-full bg-primary/55
        "
      />
    </div>
    <div class="flex flex-col gap-1">
      <p class="text-sm font-medium text-highlighted">
        {{ label }}
      </p>
      <p class="text-xs text-muted">
        Just a moment
      </p>
    </div>
  </Motion>
</template>
