<script setup lang="ts">
import { useUpdateShoppingListItemMutation } from '../api/updateShoppingListItem.mutation'

const props = defineProps<{
  item: {
    id: string
    name: string
    amount: number | null
    note: string | null
    unit: string | null
  } | null
}>()

const emit = defineEmits<{
  update: [item: NonNullable<typeof props.item>]
}>()
const open = defineModel<boolean>('open', {
  default: false,
})
const updateShoppingListItemMutation = useUpdateShoppingListItemMutation()
const form = reactive({
  name: '',
  amount: undefined as number | undefined,
  note: '',
  unit: '',
})

watch(() => props.item, (item) => {
  form.amount = item?.amount ?? undefined
  form.name = item?.name || ''
  form.note = item?.note || ''
  form.unit = item?.unit || ''
}, {
  immediate: true,
})

function save() {
  if (!props.item || !form.name.trim()) {
    return
  }

  const input = {
    id: props.item.id,
    name: form.name,
    amount: form.amount === undefined || Number.isNaN(form.amount) ? null : form.amount,
    note: form.note || null,
    unit: form.unit || null,
  }
  const updatedItem = {
    ...props.item,
    ...input,
  }

  emit('update', updatedItem)
  void updateShoppingListItemMutation.mutateAsync(input).catch(() => {
    emit('update', props.item!)
  })
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Edit item"
  >
    <template #body>
      <form
        class="flex flex-col gap-4"
        @submit.prevent="save"
      >
        <div class="grid grid-cols-[minmax(0,1fr)_6rem_5rem] gap-3">
          <UFormField label="Item">
            <UInput
              v-model="form.name"
              placeholder="e.g. Oat milk"
            />
          </UFormField>
          <UFormField label="Amount">
            <UInput
              v-model.number="form.amount"
              min="0"
              placeholder="—"
              type="number"
            />
          </UFormField>
          <UFormField label="Unit">
            <UInput
              v-model="form.unit"
              placeholder="g"
            />
          </UFormField>
        </div>
        <UFormField label="Note">
          <UInput
            v-model="form.note"
            placeholder="Optional note"
          />
        </UFormField>
        <div class="flex items-center justify-end gap-2 pt-1">
          <UButton
            color="neutral"
            label="Cancel"
            variant="ghost"
            @click="open = false"
          />
          <UButton
            :disabled="!form.name.trim()"
            :loading="updateShoppingListItemMutation.isLoading.value"
            label="Save changes"
            type="submit"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
