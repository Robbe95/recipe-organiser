<script setup lang="ts">
const props = defineProps<{
  ingredients: Array<{ id: string
    name: string }>
}>()

/* eslint-disable @intlify/vue-i18n/no-raw-text */
const emit = defineEmits<{
  add: [value: string]
}>()

const value = ref('')
const activeIndex = ref(-1)
const searchTerm = computed(() => value.value.trim().replace(/^\d+(?:\.\d+)?\s*/, '').toLowerCase())
const matches = computed(() => searchTerm.value
  ? props.ingredients.filter((ingredient) => ingredient.name.toLowerCase().includes(searchTerm.value)).slice(0, 6)
  : [])

function addIngredient(name: string) {
  const amount = value.value.trim().match(/^\d+(?:\.\d+)?\s*/)?.[0] || ''

  emit('add', `${amount}${name}`)
  value.value = ''
}

function submit() {
  const entry = value.value.trim()

  if (!entry) {
    return
  }

  const activeIngredient = matches.value[activeIndex.value]

  if (activeIngredient) {
    addIngredient(activeIngredient.name)

    return
  }

  emit('add', entry)
  value.value = ''
}

function moveActiveIndex(direction: -1 | 1) {
  if (matches.value.length === 0) {
    return
  }

  activeIndex.value = (activeIndex.value + direction + matches.value.length) % matches.value.length
}

function acceptActiveSuggestion(event: KeyboardEvent) {
  const activeIngredient = matches.value[activeIndex.value] || matches.value[0]

  if (!activeIngredient) {
    return
  }

  event.preventDefault()
  addIngredient(activeIngredient.name)
}

watch(searchTerm, () => {
  activeIndex.value = -1
})
</script>

<template>
  <div
    class="relative flex items-center gap-2 rounded-xl p-2"
  >
    <UIcon
      name="i-lucide-zap"
      class="ml-1 size-4 shrink-0 text-primary"
    />
    <UInput
      v-model="value"
      class="flex-1"
      placeholder="Quick add: 2 tomatoes or 400 pasta"
      @keydown.enter.prevent="submit"
      @keydown.tab="acceptActiveSuggestion"
      @keydown.down.prevent="moveActiveIndex(1)"
      @keydown.up.prevent="moveActiveIndex(-1)"
    />
    <UButton
      label="Add"
      icon="i-lucide-plus"
      @click="submit"
    />
    <div
      v-if="matches.length > 0"
      class="
        absolute inset-x-0 top-full z-10 mt-2 overflow-hidden rounded-xl border
        border-default bg-default shadow-lg
      "
    >
      <button
        v-for="(ingredient, index) in matches"
        :key="ingredient.id"
        :class="[
          activeIndex === index ? 'bg-elevated' : '',
        ]"
        class="
          flex w-full items-center gap-2 px-3 py-2 text-left text-sm
          hover:bg-elevated
        "
        type="button"
        @mouseenter="activeIndex = index"
        @focus="activeIndex = index"
        @click="addIngredient(ingredient.name)"
      >
        <UIcon
          name="i-lucide-plus"
          class="size-4 text-primary"
        />{{ ingredient.name }}
      </button>
    </div>
  </div>
  <p class="text-xs text-toned">
    Press Enter to add. New ingredients ask for their saved details once.
  </p>
</template>
