import type { Field } from 'formango'

/** Maps a Formango field to the validation contract used by AppFormField. */
export function toFormField<TValue, TDefaultValue>(
  field: Field<TValue, TDefaultValue>,
): {
  isTouched: boolean | undefined
  errors: string[]
} {
  return {
    isTouched: field.isTouched.value,
    errors: field.errors.value.map((error) => error.message),
  }
}

/** Maps a Formango field to the v-model contract used by Nuxt UI inputs. */
export function toInputField<TValue, TDefaultValue>(
  field: Field<TValue, TDefaultValue>,
): {
  'modelValue': TValue | undefined
  'onBlur': () => void
  'onUpdate:modelValue': (value: TValue | null) => void
} {
  return {
    'modelValue': field.modelValue.value ?? undefined,
    'onBlur': field.onBlur,
    'onUpdate:modelValue': field['onUpdate:modelValue'],
  }
}
