<!-- eslint-disable @intlify/vue-i18n/no-raw-text -->
<script setup lang="ts">
/* eslint-disable better-tailwindcss/no-unknown-classes */
const route = useRoute()

const kitchenTabs = [
  {
    icon: 'i-lucide-book-open',
    label: 'Recipes',
    to: '/kitchen',
  },
  {
    icon: 'i-lucide-calendar-heart',
    label: 'Meal plan',
    to: '/kitchen/meal-plan',
  },
  {
    icon: 'i-lucide-shopping-basket',
    label: 'Shopping list',
    to: '/kitchen/shopping-list',
  },
]

function isActiveTab(to: string) {
  return to === '/kitchen'
    ? route.path === to
    : route.path.startsWith(to)
}

const isCookingRoute = computed(() => route.path.startsWith('/kitchen/recipes/'))

function preventPinchZoom(event: TouchEvent) {
  if (event.touches.length > 1) {
    event.preventDefault()
  }
}

function preventGestureZoom(event: Event) {
  event.preventDefault()
}

onMounted(() => {
  document.addEventListener('touchmove', preventPinchZoom, {
    passive: false,
  })
  document.addEventListener('gesturestart', preventGestureZoom)
})

onBeforeUnmount(() => {
  document.removeEventListener('touchmove', preventPinchZoom)
  document.removeEventListener('gesturestart', preventGestureZoom)
})

useHead({
  meta: [
    {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
    },
  ],
})
</script>

<template>
  <div class="kitchen-surface min-h-dvh touch-pan-x touch-pan-y bg-default">
    <main
      :class="isCookingRoute
        ? ''
        : `
          pb-[calc(5.75rem+env(safe-area-inset-bottom))]
          md:pb-32
        `"
    >
      <slot />
    </main>
    <nav
      v-if="!isCookingRoute"
      aria-label="Kitchen navigation"
      class="
        kitchen-dock fixed inset-x-3 bottom-3 z-20 rounded-2xl border p-1
        md:inset-x-auto md:bottom-5 md:left-1/2 md:w-120 md:-translate-x-1/2
      "
      style="margin-bottom: env(safe-area-inset-bottom)"
    >
      <div
        class="
          flex h-14 items-stretch
          md:h-15
        "
      >
        <NuxtLink
          v-for="tab in kitchenTabs"
          :key="tab.to"
          :to="tab.to"
          :class="isActiveTab(tab.to)
            ? 'kitchen-dock-active text-primary'
            : `
              text-muted
              hover:text-highlighted
            `"
          class="
            flex min-w-0 flex-1 flex-col items-center justify-center gap-1
            rounded-xl px-3 text-[0.65rem] font-semibold transition-all
            duration-200
            active:scale-[0.97]
            md:flex-row md:gap-2.5 md:px-4 md:text-sm
          "
        >
          <UIcon
            :name="tab.icon"
            :class="isActiveTab(tab.to) ? 'fill-primary/10' : ''"
            class="
              size-5
              md:size-5
            "
          />
          <span class="whitespace-nowrap">{{ tab.label }}</span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>
