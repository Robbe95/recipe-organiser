<script setup lang="ts">
import IngredientTypeIconPicker from './IngredientTypeIconPicker.vue'

const props = defineProps<{
  editing: boolean
  open: boolean
}>()

const emit = defineEmits<{
  'submit': []
  'update:open': [value: boolean]
}>()

const form = defineModel<{
  name: string
  icon: string
}>('form', {
  required: true,
})

const open = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})
</script>

<template>
  <UModal
    v-model:open="open"
    :title="editing ? 'Edit ingredient type' : 'New ingredient type'"
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="emit('submit')"
      >
        <UFormField
          label="Name"
          required
        >
          <UInput
            v-model="form.name"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Icon">
          <IngredientTypeIconPicker v-model="form.icon" />
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="open = false"
          />
          <UButton
            type="submit"
            label="Save type"
            icon="i-lucide-check"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
