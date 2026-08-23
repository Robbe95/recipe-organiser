<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
defineProps<{
  ingredientName: string
  recipes: Array<{
    id: string
    name: string
  }>
}>()

const emit = defineEmits<{
  close: [confirmed: boolean]
}>()
</script>

<template>
  <UModal title="Delete ingredient?">
    <template #body>
      <div class="flex flex-col gap-5">
        <p class="text-sm text-toned">
          <template v-if="recipes.length > 0">
            <span class="font-medium text-highlighted">{{ ingredientName }}</span> is used in {{ recipes.length }} {{ recipes.length === 1 ? 'recipe' : 'recipes' }}. Deleting it will remove it from those recipes.
          </template>
          <template v-else>
            Delete <span class="font-medium text-highlighted">{{ ingredientName }}</span> from your ingredient library?
          </template>
        </p>
        <div
          v-if="recipes.length > 0"
          class="flex flex-col gap-1 rounded-lg bg-elevated p-2"
        >
          <NuxtLink
            v-for="recipe in recipes"
            :key="recipe.id"
            :to="`/recipes/${recipe.id}/edit`"
            class="
              rounded-md px-2 py-1.5 text-sm text-primary
              hover:bg-default
            "
            @click="emit('close', false)"
          >
            {{ recipe.name }}
          </NuxtLink>
        </div>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="emit('close', false)"
          />
          <UButton
            label="Delete ingredient"
            color="error"
            icon="i-lucide-trash-2"
            @click="emit('close', true)"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
