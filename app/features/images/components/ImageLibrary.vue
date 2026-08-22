<script setup lang="ts">
defineProps<{
  readonly images: Array<{
    id: string
    urls: {
      thumbnail: string
    }
  }>
}>()
</script>

<template>
  <div
    class="
      grid grid-cols-2 gap-3
      sm:grid-cols-3
      lg:grid-cols-4
    "
  >
    <img
      v-for="image in images"
      :key="image.id"
      :src="image.urls.thumbnail"
      alt="Recipe image"
      class="aspect-square w-full rounded-xl object-cover"
    >
  </div>
</template>
