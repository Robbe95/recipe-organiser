<template>
  <main
    class="
      -mt-12 flex min-h-dvh items-center justify-center p-5
      sm:p-8
      lg:p-10
    "
  >
    <UPageCard
      class="
        mx-auto flex w-full max-w-sm flex-1 border-0 bg-transparent shadow-none
        sm:p-0
      "
    >
      <slot />
    </UPageCard>
  </main>
</template>
