<script setup lang="ts">
import {
  AnimatePresence,
  Motion,
} from 'motion-v'
import { computed } from 'vue'

import AppQuerySkeleton from './AppQuerySkeleton.vue'

const props = withDefaults(defineProps<{
  hasData?: boolean
  columns?: number
  loading: boolean
  rows?: number
  variant?: 'calendar' | 'dashboard' | 'detail' | 'list' | 'table'
}>(), {
  columns: 3,
  rows: 4,
  variant: 'list',
})

const showSkeleton = computed(() => props.loading && !props.hasData)
</script>

<template>
  <AnimatePresence mode="popLayout">
    <Motion
      v-if="showSkeleton"
      key="skeleton"
      :animate="{ opacity: 1 }"
      :exit="{ opacity: 0 }"
      :initial="{ opacity: 0 }"
      :transition="{ duration: 0.12,
                     ease: 'easeOut' }"
    >
      <AppQuerySkeleton
        :columns="columns"
        :rows="rows"
        :variant="variant"
      />
    </Motion>
    <Motion
      v-else
      key="content"
      :animate="{ opacity: 1,
                  y: 0 }"
      :exit="{ opacity: 0 }"
      :initial="{ opacity: 0,
                  y: 0 }"
      :transition="{ duration: 0.16,
                     ease: 'easeOut' }"
    >
      <slot />
    </Motion>
  </AnimatePresence>
</template>
