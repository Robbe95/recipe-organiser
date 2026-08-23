<script setup lang="ts">
import RecipeEditor from '~/features/recipes/components/RecipeEditor.vue'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})
</script>

<template>
  <PageShell>
    <RecipeEditor />
  </PageShell>
</template>
