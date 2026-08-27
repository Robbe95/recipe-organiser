<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import { useImportRecipeFromImageMutation } from '../api/importRecipeFromImage.mutation'
import { useImportRecipeFromTextMutation } from '../api/importRecipeFromText.mutation'
import { useImportRecipeFromUrlMutation } from '../api/importRecipeFromUrl.mutation'
import RecipeImportImageUpload from './RecipeImportImageUpload.vue'

const emit = defineEmits<{
  close: [recipeId?: string]
}>()

const imageId = ref<string | null>(null)
const importMode = ref<'image' | 'text' | 'url'>('image')
const importError = ref('')
const recipeText = ref('')
const recipeUrl = ref('')
const importImageMutation = useImportRecipeFromImageMutation()
const importTextMutation = useImportRecipeFromTextMutation()
const importUrlMutation = useImportRecipeFromUrlMutation()

watch(imageId, (value) => {
  if (value) {
    importMode.value = 'image'
  }
})
watch(recipeText, (value) => {
  if (value.trim()) {
    importMode.value = 'text'
  }
})
watch(recipeUrl, (value) => {
  if (value.trim()) {
    importMode.value = 'url'
  }
})

const isImporting = computed(() => importImageMutation.isLoading.value
  || importTextMutation.isLoading.value
  || importUrlMutation.isLoading.value)
const canImport = computed(() => {
  if (importMode.value === 'image') {
    return Boolean(imageId.value)
  }

  if (importMode.value === 'text') {
    return recipeText.value.trim().length >= 20
  }

  return recipeUrl.value.trim().length > 0
})

async function importRecipe() {
  if (!canImport.value) {
    return
  }

  try {
    importError.value = ''

    let imported

    if (importMode.value === 'image') {
      imported = await importImageMutation.mutateAsync({
        imageId: imageId.value!,
      })
    }
    else if (importMode.value === 'text') {
      imported = await importTextMutation.mutateAsync({
        text: recipeText.value.trim(),
      })
    }
    else {
      imported = await importUrlMutation.mutateAsync({
        url: recipeUrl.value.trim(),
      })
    }

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
    :dismissible="!isImporting"
    title="Import recipe"
  >
    <template #body>
      <div class="flex flex-col gap-5">
        <div class="flex flex-col gap-1">
          <p class="text-sm text-toned">
            Choose a source. The AI creates a draft with Generic nutrition for every ingredient, ready for you to check.
          </p>
        </div>

        <UTabs
          v-model="importMode"
          :content="false"
          :items="[
            { label: 'Image',
              value: 'image',
              icon: 'i-lucide-image' },
            { label: 'Website',
              value: 'url',
              icon: 'i-lucide-link' },
            { label: 'Text',
              value: 'text',
              icon: 'i-lucide-align-left' },
          ]"
          class="w-full"
          variant="link"
        />

        <template v-if="importMode === 'image'">
          <div class="flex flex-col gap-1">
            <p class="text-sm font-medium text-highlighted">
              Recipe photo or screenshot
            </p>
            <p class="text-xs text-dimmed">
              Click to choose a file, or paste an image straight from your clipboard.
            </p>
          </div>
          <RecipeImportImageUpload v-model="imageId" />
        </template>

        <template v-else-if="importMode === 'url'">
          <div class="flex flex-col gap-1">
            <p class="text-sm font-medium text-highlighted">
              Recipe website
            </p>
            <p class="text-xs text-dimmed">
              Use a public recipe page with an ingredients list and instructions.
            </p>
          </div>
          <UInput
            v-model="recipeUrl"
            :disabled="isImporting"
            class="w-full"
            icon="i-lucide-link"
            type="url"
            placeholder="https://example.com/recipe"
          />
        </template>

        <template v-else>
          <div class="flex flex-col gap-1">
            <p class="text-sm font-medium text-highlighted">
              Recipe text
            </p>
            <p class="text-xs text-dimmed">
              Paste notes, an ingredient list, or the full recipe.
            </p>
          </div>
          <UTextarea
            v-model="recipeText"
            :rows="9"
            :disabled="isImporting"
            class="w-full"
            placeholder="Paste the recipe here…"
          />
        </template>

        <p
          v-if="importError"
          class="text-sm text-error"
        >
          {{ importError }}
        </p>

        <div class="flex justify-end gap-2">
          <UButton
            :disabled="isImporting"
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="emit('close')"
          />
          <UButton
            :disabled="!canImport || isImporting"
            :loading="isImporting"
            :label="isImporting ? 'Importing recipe…' : 'Import recipe'"
            icon="i-lucide-sparkles"
            @click="importRecipe"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
