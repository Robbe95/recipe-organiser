<script setup lang="ts">
import lucide from '@iconify-json/lucide/icons.json'
import { useElementSize } from '@vueuse/core'

const icon = defineModel<string>({
  required: true,
})
const iconGap = 6
const iconSize = 32
const open = ref(false)
const search = ref('')
const scrollArea = useTemplateRef('scrollArea')
const {
  width,
} = useElementSize(computed(() => scrollArea.value?.$el))
const icons = Object.keys(lucide.icons).map((name) => `i-lucide-${name}`)
const filteredIcons = computed(() => icons.filter((name) => name.includes(search.value.trim().toLowerCase())))
const iconLanes = computed(() => Math.max(1, Math.floor((width.value + iconGap) / (iconSize + iconGap))))

function selectIcon(name: string) {
  icon.value = name
  open.value = false
}
</script>

<template>
  <UPopover
    v-model:open="open"
    :ui="{ content: 'w-(--reka-popper-anchor-width)' }"
  >
    <UButton
      :icon="icon"
      color="neutral"
      variant="outline"
      trailing-icon="i-lucide-chevron-down"
      class="w-full justify-between"
      aria-label="Choose an ingredient type icon"
    />
    <template #content>
      <div class="flex w-full flex-col gap-2 p-2">
        <UInput
          v-model="search"
          class="w-full"
          icon="i-lucide-search"
          placeholder="Search icons"
        />
        <UScrollArea
          ref="scrollArea"
          v-slot="{ item }"
          :items="filteredIcons"
          :virtualize="{
            estimateSize: iconSize,
            gap: iconGap,
            lanes: iconLanes,
            skipMeasurement: true,
          }"
          :ui="{ item: 'flex justify-center' }"
          class="h-60 w-full"
        >
          <UButton
            :icon="item"
            :color="icon === item ? 'primary' : 'neutral'"
            :variant="icon === item ? 'soft' : 'ghost'"
            :aria-label="item.replace('i-lucide-', '')"
            square
            @click="selectIcon(item)"
          />
        </UScrollArea>
      </div>
    </template>
  </UPopover>
</template>
