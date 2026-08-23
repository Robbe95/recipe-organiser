<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import { put } from '@vercel/blob/client'

import { useCompleteImageUploadMutation } from '../api/completeUpload.mutation'
import { useCreateImageUploadMutation } from '../api/createUpload.mutation'
import { useImageAssetsQuery } from '../api/listImages.query'
import type {
  ImageCrop,
  ImagePoint,
} from '../lib/crop'
import ImageCropEditor from './ImageCropEditor.vue'
import ImageLibrary from './ImageLibrary.vue'

const emit = defineEmits<{
  uploaded: [image: {
    id: string
  }]
}>()

type UploadStage = 'complete' | 'idle' | 'optimising' | 'preparing' | 'uploading'

const completeUpload = useCompleteImageUploadMutation()
const createUpload = useCreateImageUploadMutation()
const errorMessage = ref('')
const imageAssets = useImageAssetsQuery()
const stage = ref<UploadStage>('idle')

const isWorking = computed(() => stage.value !== 'complete' && stage.value !== 'idle')
const stageLabel = computed(() => ({
  complete: 'Image ready',
  idle: 'Upload image',
  optimising: 'Creating WebP sizes…',
  preparing: 'Preparing upload…',
  uploading: 'Uploading original…',
}[stage.value]))

async function uploadImage(payload: {
  crop: ImageCrop
  file: File
  focal: ImagePoint
}) {
  try {
    errorMessage.value = ''
    stage.value = 'preparing'

    const uploadTarget = await createUpload.mutateAsync({
      contentType: payload.file.type as 'image/avif' | 'image/heic' | 'image/heif' | 'image/jpeg' | 'image/png' | 'image/webp',
      crop: payload.crop,
      fileName: payload.file.name,
      focalX: payload.focal.x,
      focalY: payload.focal.y,
      size: payload.file.size,
    })

    stage.value = 'uploading'

    await put(uploadTarget.sourceKey, payload.file, {
      access: 'public',
      contentType: payload.file.type,
      multipart: payload.file.size > 4 * 1024 * 1024,
      token: uploadTarget.clientToken,
    })

    stage.value = 'optimising'

    const image = await completeUpload.mutateAsync({
      id: uploadTarget.id,
      contentType: payload.file.type as 'image/avif' | 'image/heic' | 'image/heif' | 'image/jpeg' | 'image/png' | 'image/webp',
      crop: payload.crop,
      focalX: payload.focal.x,
      focalY: payload.focal.y,
      sourceKey: uploadTarget.sourceKey,
    })

    if (!image) {
      throw new Error('Image upload did not return an image.')
    }

    emit('uploaded', image)
    stage.value = 'complete'
  }
  catch (error) {
    console.error(error)
    errorMessage.value = 'We could not upload that image. Please try again.'
    stage.value = 'idle'
  }
}
</script>

<template>
  <section class="flex flex-col gap-5">
    <div class="flex flex-col gap-1">
      <h2 class="text-lg font-semibold text-highlighted">
        Image library
      </h2>
      <p class="text-sm text-toned">
        Crop once, set the important point, and get every WebP size automatically.
      </p>
    </div>

    <ImageCropEditor
      :error="errorMessage"
      :loading="isWorking"
      :submit-label="stageLabel"
      @submit="uploadImage"
    />

    <UAlert
      v-if="stage === 'complete'"
      description="Your image is ready in thumbnail, mobile, tablet, desktop, and full sizes."
      color="success"
      icon="i-lucide-check"
      variant="soft"
    />
    <ImageLibrary
      v-if="imageAssets.data.value?.length"
      :images="imageAssets.data.value"
    />
  </section>
</template>
