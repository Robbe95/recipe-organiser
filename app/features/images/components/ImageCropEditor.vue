<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import type {
  ImageAspect,
  ImagePoint,
  ImageSize,
} from '../lib/crop'
import { calculateCrop } from '../lib/crop'
import ImageCropControls from './ImageCropControls.vue'

const props = defineProps<{
  readonly error?: string
  readonly loading: boolean
  readonly submitLabel: string
}>()

const emit = defineEmits<{
  submit: [
    payload: {
      crop: ReturnType<typeof calculateCrop>
      file: File
      focal: ImagePoint
    },
  ]
}>()

const acceptedTypes = [
  'image/avif',
  'image/heic',
  'image/heif',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const
const aspect = ref<ImageAspect>('landscape')
const file = ref<File>()
const focal = ref<ImagePoint>({
  x: 0.5,
  y: 0.5,
})
const localError = ref('')
const imageSize = ref<ImageSize>({
  height: 0,
  width: 0,
})
const previewUrl = ref('')
const zoom = ref(1)

const aspectRatio = computed(() => aspect.value === 'square' ? 1 : 4 / 3)
const crop = computed(() => calculateCrop(
  imageSize.value,
  aspectRatio.value,
  focal.value,
  zoom.value,
))
const cropStyle = computed(() => ({
  height: `${crop.value.height * 100}%`,
  left: `${crop.value.x * 100}%`,
  top: `${crop.value.y * 100}%`,
  width: `${crop.value.width * 100}%`,
}))
const combinedError = computed(() => localError.value || props.error)

function loadFile(selectedFile: File | undefined) {
  localError.value = ''

  if (!selectedFile) {
    return
  }

  if (!(acceptedTypes as readonly string[]).includes(selectedFile.type)) {
    localError.value = 'Choose a JPEG, PNG, WebP, AVIF, or HEIC image.'

    return
  }

  if (selectedFile.size > 12 * 1024 * 1024) {
    localError.value = 'Images must be 12 MB or smaller.'

    return
  }

  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }

  file.value = selectedFile
  previewUrl.value = URL.createObjectURL(selectedFile)
  focal.value = {
    x: 0.5,
    y: 0.5,
  }
  zoom.value = 1

  const image = new Image()

  image.onload = () => {
    imageSize.value = {
      height: image.naturalHeight,
      width: image.naturalWidth,
    }
  }
  image.src = previewUrl.value
}

function updateFocalPoint(event: MouseEvent) {
  const target = event.currentTarget as HTMLElement
  const bounds = target.getBoundingClientRect()

  focal.value = {
    x: Math.min(Math.max((event.clientX - bounds.left) / bounds.width, 0), 1),
    y: Math.min(Math.max((event.clientY - bounds.top) / bounds.height, 0), 1),
  }
}

function centerFocalPoint() {
  focal.value = {
    x: 0.5,
    y: 0.5,
  }
}

function submit() {
  if (file.value) {
    emit('submit', {
      crop: crop.value,
      file: file.value,
      focal: focal.value,
    })
  }
}

onBeforeUnmount(() => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
})
</script>

<template>
  <UPageCard>
    <div
      class="
        grid gap-6
        lg:grid-cols-[minmax(0,1fr)_18rem]
      "
    >
      <div class="flex flex-col gap-4">
        <UInput
          :disabled="loading"
          accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
          type="file"
          @change="loadFile(($event.target as HTMLInputElement).files?.[0])"
        />
        <div
          v-if="previewUrl"
          class="relative aspect-4/3 overflow-hidden rounded-xl bg-elevated"
          role="button"
          tabindex="0"
          @click="updateFocalPoint"
          @keydown.enter="centerFocalPoint"
        >
          <img
            :src="previewUrl"
            alt="Selected recipe image"
            class="size-full object-cover"
          >
          <div
            :style="cropStyle"
            class="
              pointer-events-none absolute border-2 border-primary
              shadow-[0_0_0_999px_rgb(0_0_0/0.36)]
            "
          >
            <span
              class="
                absolute top-1/2 left-1/2 size-4 -translate-1/2 rounded-full
                border-2 border-white bg-primary
              "
            />
          </div>
        </div>
        <div
          v-else
          class="
            flex aspect-4/3 flex-col items-center justify-center gap-2
            rounded-xl border border-dashed border-default bg-elevated/40
            text-center
          "
        >
          <UIcon
            name="i-lucide-image-plus"
            class="size-8 text-dimmed"
          />
          <p class="text-sm font-medium text-highlighted">
            Choose a recipe photo
          </p>
          <p class="text-xs text-toned">
            JPEG, PNG, WebP, AVIF or HEIC · max 12 MB
          </p>
        </div>
      </div>

      <ImageCropControls
        v-model:aspect="aspect"
        v-model:zoom="zoom"
        :error="combinedError"
        :file-selected="Boolean(file)"
        :loading="loading"
        :submit-label="submitLabel"
        @submit="submit"
      />
    </div>
  </UPageCard>
</template>
