<script setup lang="ts">
withDefaults(defineProps<{
  columns?: number
  rows?: number
  variant?: 'calendar' | 'dashboard' | 'detail' | 'list' | 'table'
}>(), {
  columns: 3,
  rows: 4,
  variant: 'list',
})
</script>

<template>
  <div
    aria-busy="true"
    aria-label="Loading content"
    class="animate-pulse"
    role="status"
  >
    <div
      v-if="variant === 'dashboard'"
      class="flex flex-col gap-6"
    >
      <div class="flex flex-col gap-2">
        <USkeleton class="h-8 w-56 rounded-lg" />
        <USkeleton class="h-4 w-80 max-w-full rounded-sm" />
      </div>
      <div
        class="
          grid gap-4
          sm:grid-cols-2
          xl:grid-cols-4
        "
      >
        <UCard
          v-for="index in 4"
          :key="index"
        >
          <div class="flex items-center justify-between gap-4">
            <div class="flex flex-col gap-2">
              <USkeleton class="h-3 w-20 rounded-sm" />
              <USkeleton class="h-7 w-12 rounded-sm" />
            </div>
            <USkeleton class="size-10 rounded-xl" />
          </div>
        </UCard>
      </div>
      <div
        class="
          grid gap-6
          xl:grid-cols-2
        "
      >
        <UCard
          v-for="index in 2"
          :key="index"
        >
          <div class="flex flex-col gap-4">
            <USkeleton class="h-5 w-40 rounded-sm" />
            <USkeleton
              v-for="row in 4"
              :key="row"
              class="h-12 w-full rounded-xl"
            />
          </div>
        </UCard>
      </div>
    </div>

    <UCard
      v-else-if="variant === 'calendar'"
      :ui="{ body: 'p-0 sm:p-0' }"
    >
      <div class="grid grid-cols-7 border-b border-default">
        <USkeleton
          v-for="index in 7"
          :key="index"
          class="m-3 h-3 rounded-sm"
        />
      </div>
      <div class="grid grid-cols-7">
        <div
          v-for="index in rows * 7"
          :key="index"
          class="h-40 border-r border-b border-default p-2"
        >
          <USkeleton class="size-6 rounded-full" />
          <div class="mt-4 flex flex-col gap-2">
            <USkeleton class="h-4 w-full rounded-sm" />
            <USkeleton class="h-4 w-3/4 rounded-sm" />
          </div>
        </div>
      </div>
    </UCard>

    <UCard v-else-if="variant === 'detail'">
      <div class="flex flex-col gap-5">
        <div class="flex items-center justify-between gap-4">
          <div class="flex flex-col gap-2">
            <USkeleton class="h-6 w-48 rounded-sm" />
            <USkeleton class="h-4 w-72 max-w-full rounded-sm" />
          </div>
          <USkeleton class="h-9 w-28 rounded-lg" />
        </div>
        <div
          class="
            grid gap-3
            sm:grid-cols-2
          "
        >
          <USkeleton
            v-for="index in 4"
            :key="index"
            class="h-16 rounded-xl"
          />
        </div>
      </div>
    </UCard>

    <UCard
      v-else
      :ui="{ body: 'p-0 sm:p-0' }"
    >
      <div
        v-if="variant === 'table'"
        :style="{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }"
        class="grid gap-3 border-b border-default p-4"
      >
        <USkeleton
          v-for="index in columns"
          :key="index"
          class="h-3 rounded-sm"
        />
      </div>
      <div class="flex flex-col divide-y divide-default">
        <div
          v-for="index in rows"
          :key="index"
          class="flex items-center gap-4 p-4"
        >
          <USkeleton class="size-10 shrink-0 rounded-xl" />
          <div class="flex flex-1 flex-col gap-2">
            <USkeleton class="h-4 w-2/5 rounded-sm" />
            <USkeleton class="h-3 w-3/5 rounded-sm" />
          </div>
          <USkeleton class="h-6 w-16 rounded-full" />
        </div>
      </div>
    </UCard>
  </div>
</template>
