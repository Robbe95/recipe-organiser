<script setup lang="ts">
interface Breadcrumb {
  label: string
  to?: string
}

withDefaults(defineProps<{
  title: string
  breadcrumbs?: ReadonlyArray<Breadcrumb>
  compact?: boolean
  description: string
}>(), {
  breadcrumbs: () => [],
  compact: false,
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
    <template v-if="$slots.actions">
      <div
        class="
          hidden items-center gap-2
          sm:flex
        "
      >
        <slot name="actions" />
      </div>
      <div
        class="
          flex items-center gap-2
          sm:hidden
        "
      >
        <slot name="primary-action">
          <slot name="actions" />
        </slot>
        <UPopover v-if="$slots['overflow-actions']">
          <UButton
            icon="i-lucide-ellipsis-vertical"
            color="neutral"
            variant="ghost"
            aria-label="More page actions"
          />
          <template #content>
            <div class="flex flex-col gap-1 p-1">
              <slot name="overflow-actions" />
            </div>
          </template>
        </UPopover>
      </div>
    </template>
  </Teleport>

  <div :class="compact ? 'sr-only' : 'flex flex-col gap-1'">
    <TextH1 :text="title" />
    <TextP :text="description" />
  </div>
</template>
