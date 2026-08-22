<script setup lang="ts">
import RecipeEditor from '~/features/recipes/components/RecipeEditor.vue'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})
</script>

<template>
  <section
    class="
      w-full py-4
      sm:py-8
    "
  >
    <RecipeEditor />
  </section>
</template>
