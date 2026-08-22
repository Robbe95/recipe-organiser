<script setup lang="ts">
import AuthLoginForm from '~/features/auth/components/AuthLoginForm.vue'

definePageMeta({
  layout: 'auth',
  middleware: 'guest',
})
</script>

<template>
  <AuthLoginForm />
</template>
