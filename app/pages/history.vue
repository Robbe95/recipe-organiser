<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import ConfirmDeleteModal from '~/components/ConfirmDeleteModal.vue'
import PageHeader from '~/components/page/PageHeader.vue'
import PageShell from '~/components/page/PageShell.vue'
import { useDeleteRecipeCookingHistoryMutation } from '~/features/recipes/api/deleteRecipeCookingHistory.mutation'
import { useRecipeCookingHistoryQuery } from '~/features/recipes/api/listRecipeCookingHistory.query'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

const historyQuery = useRecipeCookingHistoryQuery()
const history = computed(() => historyQuery.data.value || [])
const deleteHistoryMutation = useDeleteRecipeCookingHistoryMutation()
const overlay = useOverlay()
const confirmDeleteModal = overlay.create(ConfirmDeleteModal)

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

async function removeEntry(entry: {
  id: string
  recipeName: string
}) {
  const confirmed = await confirmDeleteModal.open({
    title: 'Remove from cooking history?',
    description: `Remove ${entry.recipeName} from your history? This cannot be undone.`,
  })

  if (!confirmed) {
    return
  }

  await deleteHistoryMutation.mutateAsync({
    id: entry.id,
  })
}
</script>

<template>
  <PageShell>
    <PageHeader
      title="Cooking history"
      description="A record of the recipes you’ve made and the notes you left for next time."
    />

    <KitchenLoading
      v-if="historyQuery.isPending.value"
      label="Opening your cooking history"
    />
    <UEmpty
      v-else-if="history.length === 0"
      icon="i-lucide-history"
      title="Nothing cooked yet"
      description="Finish a recipe in Kitchen mode to add it here."
    >
      <template #actions>
        <UButton
          to="/kitchen"
          label="Open Kitchen mode"
          icon="i-lucide-chef-hat"
        />
      </template>
    </UEmpty>
    <div
      v-else
      class="flex flex-col gap-3"
    >
      <UPageCard
        v-for="entry in history"
        :key="entry.id"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex min-w-0 flex-col gap-2">
            <div class="flex min-w-0 items-center gap-2">
              <UIcon
                name="i-lucide-chef-hat"
                class="size-5 text-primary"
              />
              <h2 class="truncate font-semibold text-highlighted">
                {{ entry.recipeName }}
              </h2>
            </div>
            <p class="text-sm text-toned">
              {{ formatDate(entry.createdAt) }}
            </p>
            <p
              v-if="entry.calories !== null"
              class="text-sm font-medium text-primary"
            >
              {{ entry.calories }} kcal for the whole dish
            </p>
            <p
              v-if="entry.note"
              class="rounded-xl bg-elevated px-3 py-2 text-sm text-highlighted"
            >
              {{ entry.note }}
            </p>
          </div>
          <UButton
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            aria-label="Remove from cooking history"
            @click="removeEntry(entry)"
          />
        </div>
      </UPageCard>
    </div>
  </PageShell>
</template>
