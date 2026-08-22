<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import { useCompleteImageUploadMutation } from '../api/completeUpload.mutation'
import { useCreateImageUploadMutation } from '../api/createUpload.mutation'
import { useImageAssetsQuery } from '../api/listImages.query'
import type {
  ImageCrop,
  ImagePoint,
} from '../lib/crop'
import ImageCropEditor from './ImageCropEditor.vue'

const imageId = defineModel<string | null>({
  required: true,
})

const completeUpload = useCompleteImageUploadMutation()
const createUpload = useCreateImageUploadMutation()
const imageAssetsQuery = useImageAssetsQuery()
const cropEditor = useTemplateRef('cropEditor')
const fileInput = useTemplateRef('fileInput')
const errorMessage = ref('')
const modalOpen = ref(false)
const newImagePreviewUrl = ref('')
const uploading = ref(false)
const imagePreviewUrl = computed(() => newImagePreviewUrl.value
  || imageAssetsQuery.data.value?.find((image) => image.id === imageId.value)?.urls.thumbnail
  || '')

function chooseFile() {
  fileInput.value?.click()
}

async function openEditor(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]

  if (!file) {
    return
  }

  modalOpen.value = true
  await nextTick()
  cropEditor.value?.loadFile(file)

  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

async function uploadImage(payload: {
  crop: ImageCrop
  file: File
  focal: ImagePoint
}) {
  try {
    errorMessage.value = ''
    uploading.value = true

    const upload = await createUpload.mutateAsync({
      contentType: payload.file.type as 'image/avif' | 'image/heic' | 'image/heif' | 'image/jpeg' | 'image/png' | 'image/webp',
      crop: payload.crop,
      fileName: payload.file.name,
      focalX: payload.focal.x,
      focalY: payload.focal.y,
      size: payload.file.size,
    })
    const response = await fetch(upload.uploadUrl, {
      body: payload.file,
      headers: {
        'content-type': payload.file.type,
      },
      method: 'PUT',
    })

    if (!response.ok) {
      throw new Error('Image upload failed.')
    }

    const image = await completeUpload.mutateAsync({
      id: upload.id,
      contentType: payload.file.type as 'image/avif' | 'image/heic' | 'image/heif' | 'image/jpeg' | 'image/png' | 'image/webp',
      crop: payload.crop,
      focalX: payload.focal.x,
      focalY: payload.focal.y,
      sourceKey: upload.sourceKey,
    })

    if (!image) {
      throw new Error('Image upload did not return an image.')
    }

    imageId.value = image.id

    if (newImagePreviewUrl.value) {
      URL.revokeObjectURL(newImagePreviewUrl.value)
    }

    newImagePreviewUrl.value = URL.createObjectURL(payload.file)
    modalOpen.value = false
  }
  catch (error) {
    console.error(error)
    errorMessage.value = 'We could not upload that image. Please try again.'
  }
  finally {
    uploading.value = false
  }
}

onBeforeUnmount(() => {
  if (newImagePreviewUrl.value) {
    URL.revokeObjectURL(newImagePreviewUrl.value)
  }
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <label
      class="sr-only"
      for="recipe-image-input"
    >Choose recipe image</label>
    <input
      id="recipe-image-input"
      ref="fileInput"
      accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
      class="hidden"
      type="file"
      @change="openEditor"
    >
    <button
      type="button"
      class="
        relative flex h-48 w-full flex-col items-center justify-center gap-2
        overflow-hidden rounded-xl border border-dashed border-default
        bg-elevated/40 text-center transition-colors
        hover:bg-elevated
      "
      @click="chooseFile"
    >
      <img
        v-if="imagePreviewUrl"
        :src="imagePreviewUrl"
        alt="Recipe image preview"
        class="absolute inset-0 size-full object-cover"
      >
      <span
        :class="imagePreviewUrl ? 'absolute inset-0 bg-black/45' : ''"
        aria-hidden="true"
      />
      <UIcon
        :name="imageId ? 'i-lucide-image-check' : 'i-lucide-image-plus'"
        :class="imagePreviewUrl ? 'relative size-7 text-white' : `
          size-7 text-primary
        `"
      />
      <span
        :class="imagePreviewUrl ? 'relative text-sm font-medium text-white' : `
          text-sm font-medium text-highlighted
        `"
      >{{ imageId ? 'Replace recipe image' : 'Upload recipe image' }}</span>
      <span
        :class="imagePreviewUrl ? 'relative text-xs text-white/80' : `
          text-xs text-toned
        `"
      >JPEG, PNG, WebP, AVIF or HEIC · max 12 MB</span>
    </button>
  </div>

  <UModal
    v-model:open="modalOpen"
    title="Edit recipe image"
  >
    <template #body>
      <ImageCropEditor
        ref="cropEditor"
        :error="errorMessage"
        :loading="uploading"
        :show-file-input="false"
        submit-label="Use image"
        @submit="uploadImage"
      />
    </template>
  </UModal>
</template>
