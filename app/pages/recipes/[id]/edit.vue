<script setup lang="ts">
import PageShell from '~/components/page/PageShell.vue'
import RecipeEditor from '~/features/recipes/components/RecipeEditor.vue'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

const route = useRoute()
const recipeId = computed(() => Array.isArray(route.params.id) ? route.params.id[0] : route.params.id)
</script>

<template>
  <PageShell>
    <RecipeEditor :recipe-id="recipeId" />
  </PageShell>
</template>
