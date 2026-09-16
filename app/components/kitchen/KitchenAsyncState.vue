<script setup lang="ts">
import {
  AnimatePresence,
  Motion,
} from 'motion-v'

defineProps<{
  pending: boolean
}>()
</script>

<template>
  <AnimatePresence mode="wait">
    <Motion
      v-if="pending"
      key="loading"
      :animate="{ opacity: 1,
                  y: 0 }"
      :exit="{ opacity: 0,
               y: -6 }"
      :initial="{ opacity: 0,
                  y: 6 }"
      :transition="{ duration: 0.2,
                     ease: [0.22, 1, 0.36, 1] }"
    >
      <slot name="loading">
        <KitchenLoading />
      </slot>
    </Motion>
    <Motion
      v-else
      key="content"
      :animate="{ opacity: 1,
                  y: 0 }"
      :initial="{ opacity: 0,
                  y: 8 }"
      :transition="{ duration: 0.28,
                     ease: [0.22, 1, 0.36, 1] }"
    >
      <slot />
    </Motion>
  </AnimatePresence>
</template>
