<script setup lang="ts">
import IngredientTypeIconPicker from './IngredientTypeIconPicker.vue'

const props = defineProps<{
  editing: boolean
  initialForm: {
    name: string
    icon: string
  }
}>()

const emit = defineEmits<{
  close: [form?: {
    name: string
    icon: string
  }]
}>()

const form = reactive<{
  name: string
  icon: string
}>({
  ...props.initialForm,
})

watch(() => props.initialForm, (value) => {
  Object.assign(form, value)
}, {
  deep: true,
  immediate: true,
})

function submit() {
  if (!form.name.trim()) {
    return
  }

  emit('close', {
    ...form,
  })
}
</script>

<template>
  <UModal
    :title="editing ? 'Edit ingredient type' : 'New ingredient type'"
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="submit"
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
            @click="emit('close')"
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
