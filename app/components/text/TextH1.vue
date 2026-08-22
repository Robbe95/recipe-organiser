<script setup lang="ts">
defineProps<{
  text?: string
}>()
</script>

<template>
  <h1 class="text-xl font-semibold text-highlighted">
    <slot>{{ text }}</slot>
  </h1>
</template>
