<!-- eslint-disable @intlify/vue-i18n/no-raw-text -->
<template>
  <div class="flex min-h-dvh flex-col bg-default">
    <header
      class="
        sticky top-0 z-10 border-b border-default bg-default/95 backdrop-blur-sm
      "
    >
      <div
        class="
          mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4
          px-4
          sm:px-6
        "
      >
        <NuxtLink
          to="/kitchen"
          class="flex items-center gap-2 font-semibold text-highlighted"
        >
          <span
            class="
              grid size-9 place-items-center rounded-xl bg-primary text-inverted
            "
          >
            <UIcon
              name="i-lucide-chef-hat"
              class="size-5"
            />
          </span>
          Kitchen
        </NuxtLink>
        <div class="flex shrink-0 items-center gap-2">
          <UButton
            to="/dashboard"
            label="Manage recipes"
            icon="i-lucide-pencil"
            color="neutral"
            variant="ghost"
            class="
              hidden
              sm:inline-flex
            "
          />
          <UButton
            to="/dashboard"
            icon="i-lucide-pencil"
            color="neutral"
            variant="ghost"
            aria-label="Manage recipes"
            class="sm:hidden"
          />
        </div>
      </div>
    </header>
    <main class="flex-1">
      <slot />
    </main>
  </div>
</template>
