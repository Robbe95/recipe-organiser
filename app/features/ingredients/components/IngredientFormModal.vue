<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
const props = defineProps<{
  editing: boolean
  open: boolean
  types: Array<{
    id: string
    name: string
  }>
  units: string[]
}>()

const emit = defineEmits<{
  'submit': []
  'update:open': [value: boolean]
}>()

const form = defineModel<{
  typeId: string
  name: string
  calorieAmount: number | undefined
  calories: number | undefined
  defaultUnit: string
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
    :title="editing ? 'Edit ingredient' : 'New ingredient'"
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
            />
            <span class="shrink-0 text-sm text-toned">calories per</span>
            <UInput
              v-model.number="form.calorieAmount"
              class="min-w-0 flex-1"
              type="number"
              min="0.001"
              step="any"
              placeholder="100"
            />
            <span class="shrink-0 text-sm text-toned">{{ form.defaultUnit || 'unit' }}</span>
          </div>
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
            label="Save ingredient"
            icon="i-lucide-check"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
