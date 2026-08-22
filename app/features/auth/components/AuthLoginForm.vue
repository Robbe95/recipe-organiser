<script setup lang="ts">
import { useForm } from 'formango'
import * as v from 'valibot'

import AppFormField from '~/components/form/AppFormField.vue'
import {
  toFormField,
  toInputField,
} from '~/lib/formango'

import { useSignInMutation } from '../api/signIn.mutation'

const schema = v.object({
  email: v.pipe(
    v.string(),
    v.nonEmpty('Email is required.'),
    v.email('Enter a valid email address.'),
  ),
  password: v.pipe(
    v.string(),
    v.nonEmpty('Password is required.'),
    v.minLength(6, 'Password must be at least 6 characters.'),
  ),
})

const isLoading = ref(false)
const errorMessage = ref('')
const signInMutation = useSignInMutation()

const form = useForm({
  initialState: {
    email: '',
    password: '',
  },
  schema,
  onSubmit: signIn,
})

const email = form.register('email')
const password = form.register('password')

async function signIn(data: v.InferOutput<typeof schema>) {
  errorMessage.value = ''
  isLoading.value = true

  const {
    error,
  } = await signInMutation.mutateAsync(data)

  isLoading.value = false

  if (error) {
    errorMessage.value
      = 'We could not sign you in. Check your email and password and try again.'
  }
  else {
    await navigateTo('/dashboard')
  }
}
</script>

<template>
  <form
    class="flex flex-col gap-5"
    @submit.prevent="form.submit"
  >
    <div class="flex flex-col items-center gap-2 text-center">
      <UIcon
        name="i-lucide-chef-hat"
        class="mx-auto size-8 text-primary"
      />
      <TextH1 text="Welcome back to the kitchen" />
      <TextP
        text="Sign in to your personal recipe book."
      />
    </div>
    <AppFormField
      v-bind="toFormField(email)"
      :show-error="form.hasAttemptedToSubmit.value"
      label="Email address"
      name="email"
      required
    >
      <UInput
        v-bind="toInputField(email)"
        type="email"
        autocomplete="email"
        placeholder="you@example.com"
        class="w-full"
      />
    </AppFormField>
    <AppFormField
      v-bind="toFormField(password)"
      :show-error="form.hasAttemptedToSubmit.value"
      label="Password"
      name="password"
      required
    >
      <UInput
        v-bind="toInputField(password)"
        type="password"
        autocomplete="current-password"
        placeholder="Enter your password"
        class="w-full"
      />
    </AppFormField>
    <UAlert
      v-if="errorMessage"
      :description="errorMessage"
      color="error"
      variant="soft"
      icon="i-lucide-circle-alert"
    />
    <UButton
      :loading="isLoading"
      type="submit"
      color="neutral"
      label="Sign in"
      icon="i-lucide-log-in"
      block
    />
  </form>
</template>
