<script setup lang="ts">
defineProps<{
  loading?: boolean
}>()
</script>

<template>
  <UEmpty
    :loading="loading"
    :actions="[{ label: 'Add your first recipe',
                 icon: 'i-lucide-plus',
                 to: '/recipes/new' }]"
    icon="i-lucide-notebook-pen"
    title="Your recipe book is empty"
    description="Add a recipe from a photo, a link, or your own notes."
    class="
      py-14
      sm:py-20
    "
  />
</template>
