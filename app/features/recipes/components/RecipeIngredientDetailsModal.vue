<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
const props = defineProps<{
  name: string
  types: Array<{ id: string
    name: string }>
  units: string[]
}>()

const emit = defineEmits<{
  close: [details?: {
    typeId: string | null
    name: string
    calorieAmount: number | undefined
    calories: number | undefined
    defaultUnit: string
  }]
}>()

const form = reactive({
  typeId: '',
  name: props.name,
  calorieAmount: undefined as number | undefined,
  calories: undefined as number | undefined,
  defaultUnit: '',
})

function submit() {
  if (!form.name.trim()) {
    return
  }

  emit('close', {
    ...form,
    typeId: form.typeId || null,
    name: form.name.trim(),
  })
}

function handleOpenChange(open: boolean) {
  if (!open) {
    emit('close')
  }
}
</script>

<template>
  <UModal
    title="Add ingredient details"
    @update:open="handleOpenChange"
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="submit"
      >
        <p class="text-sm text-toned">
          Save details for this ingredient so it is ready for future recipes.
        </p>
        <UFormField
          label="Ingredient"
          required
        >
          <UInput v-model="form.name" />
        </UFormField>
        <UFormField label="Ingredient type">
          <USelectMenu
            v-model="form.typeId"
            :items="types"
            value-key="id"
            label-key="name"
            class="w-full"
            placeholder="Choose a type"
          />
        </UFormField>
        <UFormField label="Default unit">
          <USelectMenu
            v-model="form.defaultUnit"
            :items="units"
            class="w-full"
            placeholder="Choose a unit"
          />
        </UFormField>
        <UFormField label="Calories">
          <div class="flex items-center gap-2">
            <UInput
              v-model.number="form.calories"
              class="min-w-0 flex-1"
              type="number"
              min="0"
              placeholder="40"
            /><span
              class="shrink-0 text-sm text-toned"
            >per</span><UInput
              v-model.number="form.calorieAmount"
              class="min-w-0 flex-1"
              type="number"
              min="0.001"
              step="any"
              placeholder="100"
            /><span
              class="shrink-0 text-sm text-toned"
            >{{ form.defaultUnit || 'unit' }}</span>
          </div>
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="emit('close')"
          /><UButton
            label="Add ingredient"
            type="submit"
            icon="i-lucide-check"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
