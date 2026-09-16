<script setup lang="ts">
import RecipeImportWorkspace from '~/features/recipes/components/RecipeImportWorkspace.vue'

definePageMeta({
  fullScreen: true,
  layout: 'dashboard',
  middleware: 'auth',
})

const route = useRoute()
</script>

<template>
  <RecipeImportWorkspace :initial-id="String(route.params.id)" />
</template>
