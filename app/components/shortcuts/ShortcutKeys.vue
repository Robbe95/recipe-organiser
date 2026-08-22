<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
withDefaults(
  defineProps<{
    keys: readonly string[]
    sequence?: boolean
    size?: 'lg' | 'md' | 'sm'
  }>(),
  {
    sequence: false,
    size: 'sm',
  },
)
</script>

<template>
  <span
    class="
      hidden items-center gap-1
      lg:flex
    "
  >
    <template
      v-for="(key, index) in keys"
      :key="key"
    >
      <span
        v-if="sequence && index > 0"
        class="text-[8px] leading-none text-dimmed"
      >then</span>
      <UKbd
        :value="key"
        :size="size"
      />
    </template>
  </span>
</template>
