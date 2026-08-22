<script setup lang="ts">
import IngredientOverview from '~/features/ingredients/components/IngredientOverview.vue'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})
</script>

<template>
  <IngredientOverview />
</template>
