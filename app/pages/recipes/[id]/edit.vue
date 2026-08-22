<script setup lang="ts">
import RecipeEditor from '~/features/recipes/components/RecipeEditor.vue'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

const route = useRoute()
const recipeId = computed(() => Array.isArray(route.params.id) ? route.params.id[0] : route.params.id)
</script>

<template>
  <section
    class="
      w-full py-4
      sm:py-8
    "
  >
    <RecipeEditor :recipe-id="recipeId" />
  </section>
</template>
