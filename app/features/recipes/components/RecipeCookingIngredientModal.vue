<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
const props = defineProps<{
  initialVariantId: string
  ingredientName: string
  initialWeight: number | undefined
  requiresWeight: boolean
  variants: Array<{
    id: string
    name: string
  }>
}>()

const emit = defineEmits<{
  close: [result?: {
    type: 'add-variant'
  } | {
    variantId: string
    type: 'save'
    weight: number | undefined
  }]
}>()

const form = reactive({
  variantId: props.initialVariantId,
  weight: props.initialWeight,
})

watch(() => [
  props.initialVariantId,
  props.initialWeight,
], () => {
  form.variantId = props.initialVariantId
  form.weight = props.initialWeight
}, {
  immediate: true,
})

function save() {
  emit('close', {
    variantId: form.variantId,
    type: 'save',
    weight: form.weight,
  })
}
</script>

<template>
  <UModal :title="`Edit ${ingredientName}`">
    <template #body>
      <form
        class="flex flex-col gap-5"
        @submit.prevent="save"
      >
        <UFormField label="Variant">
          <USelectMenu
            v-model="form.variantId"
            :items="variants"
            value-key="id"
            label-key="name"
            class="w-full"
          />
        </UFormField>
        <UButton
          label="Add a new variant"
          icon="i-lucide-plus"
          color="neutral"
          variant="soft"
          class="self-start"
          type="button"
          @click="emit('close', { type: 'add-variant' })"
        />
        <UFormField
          v-if="requiresWeight"
          label="Actual weight"
        >
          <div class="flex items-center gap-2">
            <UInput
              v-model.number="form.weight"
              type="number"
              min="0"
              step="any"
              placeholder="0"
              class="w-full"
            />
            <span class="text-sm text-toned">g</span>
          </div>
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="emit('close')"
          />
          <UButton
            label="Save changes"
            icon="i-lucide-check"
            type="submit"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
