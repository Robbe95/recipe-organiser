<script setup lang="ts">
interface Breadcrumb {
  label: string
  to?: string
}

withDefaults(defineProps<{
  title: string
  breadcrumbs?: ReadonlyArray<Breadcrumb>
  description: string
}>(), {
  breadcrumbs: () => [],
})
</script>

<template>
  <Teleport to="#dashboard-page-breadcrumbs">
    <nav
      v-if="breadcrumbs.length > 0"
      aria-label="Breadcrumb"
      class="flex min-w-0 items-center gap-1"
    >
      <template
        v-for="(breadcrumb, index) in breadcrumbs"
        :key="breadcrumb.label"
      >
        <UIcon
          v-if="index"
          name="i-lucide-chevron-right"
          class="size-4 shrink-0 text-dimmed"
        />
        <UButton
          :to="breadcrumb.to"
          :label="breadcrumb.label"
          :icon="index === 0 && breadcrumb.to ? 'i-lucide-arrow-left' : undefined"
          :ui="{ base: 'max-sm:px-2',
                 label: 'max-sm:sr-only' }"
          color="neutral"
          variant="link"
          class="
            shrink-0 px-0 text-muted
            hover:text-highlighted
          "
        />
      </template>
    </nav>
  </Teleport>

  <Teleport to="#dashboard-page-actions">
    <div
      v-if="$slots.actions"
      class="flex items-center gap-2"
    >
      <slot name="actions" />
    </div>
  </Teleport>

  <div class="flex flex-col gap-1">
    <TextH1 :text="title" />
    <TextP :text="description" />
  </div>
</template>
