<script setup lang="ts">
useHead({
  htmlAttrs: {
    lang: 'en',
  },
  link: [
    {
      href: '/favicon.ico',
      rel: 'icon',
    },
  ],
  meta: [
    {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1',
    },
  ],
})

useSeoMeta({
  title: 'Recipe Organiser',
  description: 'Your calm companion for cooking at home.',
})
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator
      :height="2"
      :throttle="180"
      color="#06b6d4"
    />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
