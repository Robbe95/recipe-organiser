<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import { useImportRecipeFromImageMutation } from '../api/importRecipeFromImage.mutation'
import RecipeImportImageUpload from './RecipeImportImageUpload.vue'

const emit = defineEmits<{
  close: [recipeId?: string]
}>()

const imageId = ref<string | null>(null)
const importError = ref('')
const importRecipeMutation = useImportRecipeFromImageMutation()

async function importRecipe() {
  if (!imageId.value) {
    return
  }

  try {
    importError.value = ''

    const imported = await importRecipeMutation.mutateAsync({
      imageId: imageId.value,
    })

    emit('close', imported.id)
  }
  catch (error) {
    importError.value = error instanceof Error
      ? error.message
      : 'We could not import that recipe. Please try again.'
  }
}
</script>

<template>
  <UModal
    :dismissible="!importRecipeMutation.isLoading.value"
    title="Import recipe from image"
  >
    <template #body>
      <div class="flex flex-col gap-5">
        <div class="flex flex-col gap-1">
          <p class="text-sm text-toned">
            Upload a photo, screenshot, or scanned recipe. We’ll turn it into an editable recipe draft.
          </p>
          <p class="text-xs text-dimmed">
            URL import is coming next.
          </p>
        </div>

        <RecipeImportImageUpload v-model="imageId" />

        <p
          v-if="importError"
          class="text-sm text-error"
        >
          {{ importError }}
        </p>

        <div class="flex justify-end gap-2">
          <UButton
            :disabled="importRecipeMutation.isLoading.value"
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="emit('close')"
          />
          <UButton
            :disabled="!imageId || importRecipeMutation.isLoading.value"
            :loading="importRecipeMutation.isLoading.value"
            :label="importRecipeMutation.isLoading.value ? 'Importing recipe…' : 'Import recipe'"
            icon="i-lucide-sparkles"
            @click="importRecipe"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
