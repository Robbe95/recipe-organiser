<script setup lang="ts">
defineProps<{
  text?: string
}>()
</script>

<template>
  <p class="text-sm text-muted">
    <slot>{{ text }}</slot>
  </p>
</template>
