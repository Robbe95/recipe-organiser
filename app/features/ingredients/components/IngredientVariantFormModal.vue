<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
defineProps<{
  ingredientName: string
  units: string[]
}>()

const emit = defineEmits<{
  close: [variant?: {
    name: string
    calorieAmount: number | undefined
    calories: number | undefined
    calorieUnit: string
  }]
}>()

const form = reactive({
  name: '',
  calorieAmount: undefined as number | undefined,
  calories: undefined as number | undefined,
  calorieUnit: '',
})

function submit() {
  if (!form.name.trim()) {
    return
  }

  emit('close', {
    ...form,
    name: form.name.trim(),
  })
}
</script>

<template>
  <UModal :title="`Add ${ingredientName} variant`">
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="submit"
      >
        <p class="text-sm text-toned">
          Add the brand or store product you’re using now. It will be available next time too.
        </p>
        <UFormField
          label="Variant name"
          required
        >
          <UInput
            v-model="form.name"
            placeholder="e.g. Aldi red bell pepper"
          />
        </UFormField>
        <div
          class="
            grid gap-3
            sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]
          "
        >
          <UFormField label="Calories">
            <UInput
              v-model.number="form.calories"
              type="number"
              min="0"
              placeholder="40"
            />
          </UFormField>
          <UFormField label="Per amount">
            <UInput
              v-model.number="form.calorieAmount"
              type="number"
              min="0.001"
              step="any"
              placeholder="100"
            />
          </UFormField>
          <UFormField label="Unit">
            <USelectMenu
              v-model="form.calorieUnit"
              :items="units"
              placeholder="Unit"
              class="min-w-32"
            />
          </UFormField>
        </div>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="emit('close')"
          />
          <UButton
            label="Add variant"
            icon="i-lucide-plus"
            type="submit"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
