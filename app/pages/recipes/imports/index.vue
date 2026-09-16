<script setup lang="ts">
import RecipeImportWorkspace from '~/features/recipes/components/RecipeImportWorkspace.vue'

definePageMeta({
  fullScreen: true,
  layout: 'dashboard',
  middleware: 'auth',
})
</script>

<template>
  <RecipeImportWorkspace />
</template>
