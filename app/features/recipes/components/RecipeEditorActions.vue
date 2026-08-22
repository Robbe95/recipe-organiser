<script setup lang="ts">
defineProps<{
  error: string
  loading: boolean
}>()
</script>

<template>
  <div class="flex items-center justify-end gap-3 border-t border-default pt-5">
    <p
      v-if="error"
      class="mr-auto text-sm text-error"
    >
      {{ error }}
    </p>
    <UButton
      label="Cancel"
      color="neutral"
      variant="ghost"
      to="/dashboard"
    />
    <UButton
      :loading="loading"
      type="submit"
      label="Save recipe"
      icon="i-lucide-check"
    />
  </div>
</template>
