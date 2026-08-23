<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import { useCompleteImageUploadMutation } from '~/features/images/api/completeUpload.mutation'
import { useCreateImageUploadMutation } from '~/features/images/api/createUpload.mutation'

const imageId = defineModel<string | null>({
  required: true,
})

const completeUpload = useCompleteImageUploadMutation()
const createUpload = useCreateImageUploadMutation()
const fileInput = useTemplateRef('fileInput')
const errorMessage = ref('')
const previewUrl = ref('')
const uploading = ref(false)
const crop = {
  height: 1,
  width: 1,
  x: 0,
  y: 0,
}

function chooseFile() {
  fileInput.value?.click()
}

async function uploadFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]

  if (!file) {
    return
  }

  try {
    errorMessage.value = ''
    uploading.value = true

    const contentType = file.type as 'image/avif' | 'image/heic' | 'image/heif' | 'image/jpeg' | 'image/png' | 'image/webp'
    const upload = await createUpload.mutateAsync({
      contentType,
      crop,
      fileName: file.name,
      focalX: 0.5,
      focalY: 0.5,
      size: file.size,
    })
    const response = await fetch(upload.uploadUrl, {
      body: file,
      headers: {
        'content-type': contentType,
      },
      method: 'PUT',
    })

    if (!response.ok) {
      throw new Error('Image upload failed.')
    }

    const image = await completeUpload.mutateAsync({
      id: upload.id,
      contentType,
      crop,
      focalX: 0.5,
      focalY: 0.5,
      sourceKey: upload.sourceKey,
    })

    if (!image) {
      throw new Error('Image upload did not return an image.')
    }

    if (previewUrl.value) {
      URL.revokeObjectURL(previewUrl.value)
    }

    imageId.value = image.id
    previewUrl.value = URL.createObjectURL(file)
  }
  catch (error) {
    console.error(error)
    errorMessage.value = 'We could not upload that image. Please try again.'
  }
  finally {
    uploading.value = false

    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

onBeforeUnmount(() => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <label
      class="sr-only"
      for="recipe-import-image"
    >Choose recipe image</label>
    <input
      id="recipe-import-image"
      ref="fileInput"
      accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
      class="hidden"
      type="file"
      @change="uploadFile"
    >
    <button
      type="button"
      class="
        relative flex h-40 w-full flex-col items-center justify-center gap-2
        overflow-hidden rounded-xl border border-dashed border-default
        bg-elevated/40 text-center transition-colors
        hover:bg-elevated
      "
      @click="chooseFile"
    >
      <img
        v-if="previewUrl"
        :src="previewUrl"
        alt="Recipe to import"
        class="absolute inset-0 size-full object-cover"
      >
      <span
        v-if="previewUrl"
        class="absolute inset-0 bg-black/45"
        aria-hidden="true"
      />
      <UIcon
        :name="uploading ? 'i-lucide-loader-circle' : imageId ? 'i-lucide-image-check' : 'i-lucide-image-plus'"
        :class="[
          previewUrl ? 'text-white' : 'text-primary',
          uploading ? 'animate-spin' : '',
        ]"
        class="relative size-7"
      />
      <span
        :class="[previewUrl ? `text-white` : `text-highlighted`]"
        class="relative text-sm font-medium"
      >
        {{ uploading ? 'Uploading image…' : imageId ? 'Replace image' : 'Choose recipe image' }}
      </span>
      <span
        :class="[previewUrl ? 'text-white/80' : `text-toned`]"
        class="relative text-xs"
      >
        No crop needed · JPEG, PNG, WebP, AVIF or HEIC
      </span>
    </button>
    <p
      v-if="errorMessage"
      class="text-sm text-error"
    >
      {{ errorMessage }}
    </p>
  </div>
</template>
