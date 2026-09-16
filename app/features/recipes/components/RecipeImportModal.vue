<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import { client } from '~/lib/orpc'

import RecipeImportImageUpload from './RecipeImportImageUpload.vue'

const emit = defineEmits<{ close: [jobId?: string] }>()
const imageIds = ref<string[]>([])
const mode = ref('image')
const recipeText = ref('')
const urlText = ref('')
const uploading = ref(false)
const busy = ref(false)
const error = ref('')
const urls = computed(() => [
  ...new Set(urlText.value.split(/\s+/).map((url) => url.trim()).filter(Boolean)),
])
const invalidUrls = computed(() => urls.value.filter((value) => {
  try {
    return ![
      'http:',
      'https:',
    ].includes(new URL(value).protocol)
  }
  catch {
    return true
  }
}))
const count = computed(() => {
  if (mode.value === 'image') {
    return imageIds.value.length
  }

  return mode.value === 'url' ? urls.value.length : 1
})
const canImport = computed(() => !busy.value && !uploading.value && count.value > 0 && count.value <= 20
  && (mode.value !== 'url' || invalidUrls.value.length === 0) && (mode.value !== 'text' || recipeText.value.trim().length >= 20))

async function importRecipes() {
  if (!canImport.value) {
    return
  }

  busy.value = true
  error.value = ''

  try {
    if (mode.value === 'text') {
      const job = await client.recipes.importRecipeFromText({
        text: recipeText.value.trim(),
      })

      emit('close', job.id)
    }
    else {
      const jobs = await client.recipes.queueRecipeImports({
        imageIds: mode.value === 'image' ? imageIds.value : [],
        urls: mode.value === 'url' ? urls.value : [],
      })

      emit('close', jobs[0]?.id)
    }
  }
  catch (error_) {
    error.value = error_ instanceof Error ? error_.message : 'Could not queue your imports. Try again.'
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <UModal
    :dismissible="!busy && !uploading"
    :close="busy || uploading ? false : undefined"
    title="Import recipes"
    description="Add your sources. Review every draft before it joins your library."
  >
    <template #body>
      <div class="flex flex-col gap-5">
        <UTabs
          v-model="mode"
          :content="false"
          :items="[{ label: 'Images',
                     value: 'image',
                     icon: 'i-lucide-images' }, { label: 'URLs',
                                                  value: 'url',
                                                  icon: 'i-lucide-link' }, { label: 'Text',
                                                                             value: 'text',
                                                                             icon: 'i-lucide-align-left' }]"
          variant="link"
        />
        <RecipeImportImageUpload
          v-show="mode === 'image'"
          v-model="imageIds"
          :active="mode === 'image'"
          :disabled="busy"
          @uploading="uploading = $event"
        />
        <template v-if="mode === 'url'">
          <UFormField
            label="Recipe URLs"
            description="Paste one URL per line. Each URL creates a separate recipe. Up to 20 per batch."
          >
            <UTextarea
              v-model="urlText"
              :rows="8"
              :disabled="busy"
              class="w-full"
              placeholder="https://example.com/recipe-one&#10;https://example.com/recipe-two"
            />
          </UFormField>
          <p
            v-if="invalidUrls.length > 0"
            class="text-sm text-error"
          >
            Check {{ invalidUrls.length }} invalid URL(s). Use complete http or https links.
          </p>
          <p
            v-else
            class="text-xs text-muted"
          >
            {{ urls.length }} unique recipe URLs
          </p>
        </template>
        <UFormField
          v-if="mode === 'text'"
          label="Recipe text"
          description="Paste one complete recipe, including ingredients and instructions."
        >
          <UTextarea
            v-model="recipeText"
            :rows="8"
            :disabled="busy"
            class="w-full"
            placeholder="Paste your recipe…"
          />
        </UFormField>
        <p
          v-if="count > 20"
          class="text-sm text-error"
        >
          Import up to 20 recipes at a time.
        </p>
        <p
          v-if="error"
          role="alert"
          class="text-sm text-error"
        >
          {{ error }}
        </p>
        <div
          class="
            flex items-center justify-between gap-3 border-t border-default pt-4
          "
        >
          <span class="text-xs text-muted">Drafts appear in Pending imports.</span>
          <UButton
            :disabled="!canImport"
            :loading="busy"
            :label="`Import ${count} ${count === 1 ? 'recipe' : 'recipes'}`"
            icon="i-lucide-arrow-right"
            @click="importRecipes"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
