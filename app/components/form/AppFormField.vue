<script setup lang="ts">
import type { FormFieldProps } from '@nuxt/ui'

import AnimateHeight from '~/components/animate/AnimateHeight.vue'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<AppFormFieldProps>(), {
  isTouched: false,
  showError: false,
})

interface AppFormFieldProps extends FormFieldProps {
  /** Whether the field has been blurred at least once. */
  isTouched?: boolean
  /** Formango error messages, supplied through `toFormField`. */
  errors?: string[]
  /** Show Formango errors before blur, for example after a submit attempt. */
  showError?: boolean
}

const error = computed(() => {
  if (props.error) {
    return props.error
  }
  if (!props.showError && !props.isTouched) {
    return
  }

  return props.errors?.[0]
})
</script>

<template>
  <UFormField
    v-bind="props"
    :error="error"
    :ui="{ ...props.ui,
           error: 'mt-0' }"
  >
    <slot />
    <template #error="{ error: fieldError }">
      <AnimateHeight>
        <p
          v-if="typeof fieldError === 'string'"
          class="mt-1 text-xs text-error"
        >
          {{ fieldError }}
        </p>
      </AnimateHeight>
    </template>
  </UFormField>
</template>
