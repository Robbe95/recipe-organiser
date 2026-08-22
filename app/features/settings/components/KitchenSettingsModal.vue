<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
const colorMode = useColorMode()

function setColorMode(preference: 'dark' | 'light') {
  colorMode.preference = preference
}
</script>

<template>
  <UModal
    title="Kitchen settings"
    description="Personalise how Recipe Organiser looks on this device."
  >
    <template #body>
      <div class="flex flex-col gap-3">
        <div class="flex flex-col gap-1">
          <p class="text-sm font-medium text-highlighted">
            Appearance
          </p>
          <p class="text-sm text-muted">
            Choose the colour mode for this device.
          </p>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <UButton
            :variant="colorMode.preference === 'light' ? 'solid' : 'soft'"
            color="neutral"
            icon="i-lucide-sun"
            label="Light"
            block
            @click="setColorMode('light')"
          />
          <UButton
            :variant="colorMode.preference === 'dark' ? 'solid' : 'soft'"
            color="neutral"
            icon="i-lucide-moon"
            label="Dark"
            block
            @click="setColorMode('dark')"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
