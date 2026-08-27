<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
const props = defineProps<{
  editing: boolean
  initialForm: {
    typeId: string
    name: string
    defaultUnit: string
    requiresWeight: boolean
    variants: Array<{
      isDefault: boolean
      name: string
      calorieAmount: number | undefined
      calories: number | undefined
      calorieUnit: string
    }>
  }
  types: Array<{
    id: string
    name: string
  }>
  units: string[]
}>()

const emit = defineEmits<{
  close: [form?: {
    typeId: string
    name: string
    defaultUnit: string
    requiresWeight: boolean
    variants: Array<{
      isDefault: boolean
      name: string
      calorieAmount: number | undefined
      calories: number | undefined
      calorieUnit: string
    }>
  }]
}>()

interface IngredientForm {
  typeId: string
  name: string
  defaultUnit: string
  requiresWeight: boolean
  variants: Array<{
    isDefault: boolean
    name: string
    calorieAmount: number | undefined
    calories: number | undefined
    calorieUnit: string
  }>
}

function copyForm(value: IngredientForm): IngredientForm {
  return {
    ...value,
    variants: value.variants.map((variant) => ({
      ...variant,
    })),
  }
}

const form = reactive<IngredientForm>(copyForm(props.initialForm))

watch(() => props.initialForm, (value) => {
  Object.assign(form, copyForm(value))
}, {
  immediate: true,
})

function submit() {
  if (!form.name.trim()) {
    return
  }

  emit('close', {
    ...copyForm(form),
  })
}

function addVariant() {
  form.variants.push({
    isDefault: false,
    name: '',
    calorieAmount: undefined,
    calories: undefined,
    calorieUnit: form.defaultUnit,
  })
}

function removeVariant(index: number) {
  if (form.variants.length === 1) {
    return
  }

  const removedDefault = form.variants[index]?.isDefault

  form.variants.splice(index, 1)

  if (removedDefault && form.variants[0]) {
    form.variants[0].isDefault = true
  }
}

function setDefault(index: number) {
  form.variants.forEach((variant, variantIndex) => {
    variant.isDefault = variantIndex === index
  })
}
</script>

<template>
  <UModal
    :title="editing ? 'Edit ingredient' : 'New ingredient'"
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
        <UCheckbox
          v-model="form.requiresWeight"
          label="Weight required when cooking"
          description="Ask for the actual weight when starting a recipe."
        />
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-sm font-medium text-highlighted">
                Variants
              </p>
              <p class="text-xs text-toned">
                Each variant has its own nutrition.
              </p>
            </div>
            <UButton
              label="Add variant"
              icon="i-lucide-plus"
              size="sm"
              color="neutral"
              variant="soft"
              @click="addVariant"
            />
          </div>
          <div
            v-for="(variant, index) in form.variants"
            :key="index"
            class="flex flex-col gap-3 rounded-xl border border-default p-3"
          >
            <div class="flex items-center justify-between gap-3">
              <UFormField
                v-if="form.variants.length > 1"
                label="Variant name"
                class="flex-1"
              >
                <UInput
                  v-model="variant.name"
                  placeholder="e.g. Aldi red bell pepper"
                />
              </UFormField>
              <span
                v-else
                class="text-sm font-medium text-highlighted"
              >Nutrition</span>
              <div class="flex items-center gap-1">
                <UButton
                  :label="variant.isDefault ? 'Default' : 'Set default'"
                  :variant="variant.isDefault ? 'soft' : 'ghost'"
                  size="xs"
                  color="neutral"
                  @click="setDefault(index)"
                />
                <UButton
                  v-if="form.variants.length > 1"
                  :aria-label="`Remove ${variant.name || 'variant'}`"
                  icon="i-lucide-trash-2"
                  size="xs"
                  color="error"
                  variant="ghost"
                  @click="removeVariant(index)"
                />
              </div>
            </div>
            <div
              class="
                grid gap-2
                sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto]
                sm:items-end
              "
            >
              <UFormField label="Calories">
                <UInput
                  v-model.number="variant.calories"
                  type="number"
                  min="0"
                  placeholder="40"
                />
              </UFormField>
              <span
                class="
                  self-center text-sm text-toned
                  sm:mt-5
                "
              >per</span>
              <UFormField label="Amount">
                <UInput
                  v-model.number="variant.calorieAmount"
                  type="number"
                  min="0.001"
                  step="any"
                  placeholder="100"
                />
              </UFormField>
              <UFormField label="Unit">
                <USelectMenu
                  v-model="variant.calorieUnit"
                  :items="units"
                  placeholder="Unit"
                  class="min-w-32"
                />
              </UFormField>
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="emit('close')"
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
