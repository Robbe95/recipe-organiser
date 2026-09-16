<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import { put } from '@vercel/blob/client'

import { useCompleteImageUploadMutation } from '~/features/images/api/completeUpload.mutation'
import { useCreateImageUploadMutation } from '~/features/images/api/createUpload.mutation'

const props = defineProps<{ active?: boolean
  disabled?: boolean }>()

const emit = defineEmits<{ uploading: [value: boolean] }>()

const imageIds = defineModel<string[]>({
  required: true,
})

const completeUpload = useCompleteImageUploadMutation()
const createUpload = useCreateImageUploadMutation()
const fileInput = useTemplateRef('fileInput')
const errorMessage = ref('')
const previews = ref<{ id: string
  name: string
  url: string }[]>([])
const uploading = ref(false)

watch(uploading, (value) => emit('uploading', value))

const acceptedContentTypes = new Set([
  'image/avif',
  'image/heic',
  'image/heif',
  'image/jpeg',
  'image/png',
  'image/webp',
])
const crop = {
  height: 1,
  width: 1,
  x: 0,
  y: 0,
}

function chooseFile() {
  fileInput.value?.click()
}

async function uploadFile(file: File) {
  if (!acceptedContentTypes.has(file.type)) {
    errorMessage.value += `${file.name}: unsupported image format. `

    return
  }

  try {
    const contentType = file.type as 'image/avif' | 'image/heic' | 'image/heif' | 'image/jpeg' | 'image/png' | 'image/webp'
    const uploadTarget = await createUpload.mutateAsync({
      contentType,
      crop,
      fileName: file.name,
      focalX: 0.5,
      focalY: 0.5,
      size: file.size,
    })

    await put(uploadTarget.sourceKey, file, {
      access: 'public',
      contentType,
      multipart: file.size > 4 * 1024 * 1024,
      token: uploadTarget.clientToken,
    })

    const image = await completeUpload.mutateAsync({
      id: uploadTarget.id,
      contentType,
      crop,
      focalX: 0.5,
      focalY: 0.5,
      sourceKey: uploadTarget.sourceKey,
    })

    if (!image) {
      throw new Error('Image upload did not return an image.')
    }

    imageIds.value = [
      ...imageIds.value,
      image.id,
    ]
    previews.value.push({
      id: image.id,
      name: file.name,
      url: URL.createObjectURL(file),
    })
  }
  catch (error) {
    console.error(error)
    errorMessage.value += `${file.name}: upload failed. Please select it again to retry. `
  }
  finally {
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

async function uploadFiles(files: File[]) {
  if (uploading.value || props.disabled) {
    return
  }
  if (files.length + imageIds.value.length > 20) {
    errorMessage.value = 'Choose up to 20 images per batch.'

    return
  }

  errorMessage.value = ''
  uploading.value = true

  try {
    for (const file of files) {
      await uploadFile(file)
    }
  }
  finally {
    uploading.value = false
  }
}

async function handleFileInput(event: Event) {
  await uploadFiles(Array.from((event.target as HTMLInputElement).files || []))
}

function handlePaste(event: ClipboardEvent) {
  if (props.active === false) {
    return
  }
  const files = Array.from(event.clipboardData?.files || []).filter((item) => item.type.startsWith('image/'))

  if (files.length === 0) {
    return
  }

  event.preventDefault()
  void uploadFiles(files)
}

function removeImage(id: string) {
  const preview = previews.value.find((item) => item.id === id)

  if (preview) {
    URL.revokeObjectURL(preview.url)
  }

  previews.value = previews.value.filter((item) => item.id !== id)
  imageIds.value = imageIds.value.filter((item) => item !== id)
}

onMounted(() => {
  window.addEventListener('paste', handlePaste)
})

onBeforeUnmount(() => {
  window.removeEventListener('paste', handlePaste)

  previews.value.forEach((item) => URL.revokeObjectURL(item.url))
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <input
      ref="fileInput"
      accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
      class="hidden"
      type="file"
      aria-label="Choose recipe images"
      multiple
      @change="handleFileInput"
    >
    <button
      :disabled="uploading || props.disabled"
      type="button"
      class="
        flex h-36 flex-col items-center justify-center gap-2 rounded-lg border
        border-dashed border-default bg-muted/30
        hover:bg-elevated
      "
      @click="chooseFile"
      @dragover.prevent
      @drop.prevent="uploadFiles(Array.from($event.dataTransfer?.files || []))"
    >
      <UIcon
        :name="uploading ? 'i-lucide-loader-circle' : 'i-lucide-images'"
        :class="uploading ? `animate-spin` : ''"
        class="size-6 text-muted"
      />
      <span class="text-sm font-medium">{{ uploading ? 'Uploading images…' : 'Choose, drop or paste recipe images' }}</span>
      <span class="text-xs text-muted">One image = one recipe · Up to 20 at a time</span>
    </button>
    <div
      v-if="previews.length > 0"
      class="max-h-60 divide-y divide-default overflow-y-auto"
    >
      <div
        v-for="(preview, index) in previews"
        :key="preview.id"
        class="flex items-center gap-3 py-2"
      >
        <img
          :src="preview.url"
          :alt="preview.name"
          class="size-10 rounded-sm object-cover"
        >
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm">
            {{ preview.name }}
          </p><p
            class="text-xs text-muted"
          >
            Recipe {{ index + 1 }} · Ready to import
          </p>
        </div>
        <UButton
          :disabled="uploading || props.disabled"
          :aria-label="`Remove ${preview.name}`"
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          @click="removeImage(preview.id)"
        />
      </div>
    </div>
    <p
      v-if="errorMessage"
      role="alert"
      class="text-sm text-error"
    >
      {{ errorMessage }}
    </p>
  </div>
</template>
