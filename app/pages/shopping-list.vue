<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import PageHeader from '~/components/page/PageHeader.vue'
import PageShell from '~/components/page/PageShell.vue'
import { useAddShoppingListItemMutation } from '~/features/meal-planner/api/addShoppingListItem.mutation'
import { useClearCompletedShoppingListItemsMutation } from '~/features/meal-planner/api/clearCompletedShoppingListItems.mutation'
import { useShoppingListQuery } from '~/features/meal-planner/api/listShoppingList.query'
import { useSetShoppingListItemCompleteMutation } from '~/features/meal-planner/api/setShoppingListItemComplete.mutation'
import ShoppingListItemEditModal from '~/features/meal-planner/components/ShoppingListItemEditModal.vue'
import { compareShoppingGroups } from '~/features/meal-planner/utils/shoppingListOrder'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

const shoppingListQuery = useShoppingListQuery()
const addShoppingListItemMutation = useAddShoppingListItemMutation()
const clearCompletedMutation = useClearCompletedShoppingListItemsMutation()
const setCompleteMutation = useSetShoppingListItemCompleteMutation()

type ShoppingListItem = NonNullable<typeof shoppingListQuery.data.value>[number]

const localShoppingList = ref<ShoppingListItem[] | null>(null)

watch(() => shoppingListQuery.data.value, (items) => {
  if (items) {
    localShoppingList.value = items
  }
}, {
  immediate: true,
})

const shoppingList = computed(() => localShoppingList.value || shoppingListQuery.data.value || [])
const activeItems = computed(() => shoppingList.value.filter((item) => !item.completedAt))
const completedItems = computed(() => shoppingList.value.filter((item) => item.completedAt))
const activeGroups = computed(() => groupItems(activeItems.value))
const collapsedGroups = useState<string[]>('shopping-list-collapsed-groups', () => [])
const editingItem = ref<{
  id: string
  name: string
  amount: number | null
  note: string | null
  unit: string | null
} | null>(null)
const editOpen = ref(false)
const newItemName = ref('')

async function setComplete(id: string, completed: boolean) {
  const previous = shoppingList.value

  localShoppingList.value = shoppingList.value.map((item) => item.id === id
    ? {
        ...item,
        completedAt: completed ? new Date() : null,
      }
    : item)

  try {
    await setCompleteMutation.mutateAsync({
      id,
      completed,
    })
  }
  catch {
    localShoppingList.value = previous
  }
}

async function clearCompleted() {
  const previous = shoppingList.value

  localShoppingList.value = activeItems.value

  try {
    await clearCompletedMutation.mutateAsync()
  }
  catch {
    localShoppingList.value = previous
  }
}

async function addItem() {
  const name = newItemName.value.trim()

  if (!name) {
    return
  }

  await addShoppingListItemMutation.mutateAsync({
    name,
  })
  newItemName.value = ''
  await shoppingListQuery.refetch()
}

function editItem(item: NonNullable<typeof editingItem.value>) {
  editingItem.value = item
  editOpen.value = true
}

function updateItem(updatedItem: NonNullable<typeof editingItem.value>) {
  localShoppingList.value = shoppingList.value.map((item) => item.id === updatedItem.id
    ? {
        ...item,
        ...updatedItem,
      }
    : item)
}

function isGroupCollapsed(groupName: string) {
  return collapsedGroups.value.includes(groupName)
}

function toggleGroup(groupName: string) {
  collapsedGroups.value = isGroupCollapsed(groupName)
    ? collapsedGroups.value.filter((name) => name !== groupName)
    : [
        ...collapsedGroups.value,
        groupName,
      ]
}

function groupItems(items: ShoppingListItem[]) {
  const groups = new Map<string, ShoppingListItem[]>()

  for (const item of items) {
    const groupName = item.groupName || 'Other'
    const currentItems = groups.get(groupName) || []

    groups.set(groupName, [
      ...currentItems,
      item,
    ])
  }

  return [
    ...groups.entries(),
  ]
    .map(([
      name,
      groupItems,
    ]) => ({
      name,
      items: groupItems,
    }))
    .sort((left, right) => compareShoppingGroups(left.name, right.name))
}
</script>

<template>
  <PageShell>
    <PageHeader
      title="Shopping list"
      description="Everything added from your meal plan, ready for the shop."
    >
      <template #actions>
        <UButton
          v-if="completedItems.length > 0"
          :loading="clearCompletedMutation.isLoading.value"
          color="neutral"
          icon="i-lucide-trash-2"
          label="Clear completed"
          variant="soft"
          @click="clearCompleted"
        />
        <UButton
          to="/kitchen/shopping-list"
          icon="i-lucide-shopping-basket"
          label="Open Kitchen"
        />
      </template>
      <template #primary-action>
        <UButton
          to="/kitchen/shopping-list"
          icon="i-lucide-shopping-basket"
          label="Open Kitchen"
        />
      </template>
    </PageHeader>

    <form
      class="
        flex items-center gap-2 rounded-xl bg-elevated p-2 ring-1 ring-default
      "
      @submit.prevent="addItem"
    >
      <UInput
        v-model="newItemName"
        class="flex-1"
        icon="i-lucide-plus"
        placeholder="Add an item to the list"
      />
      <UButton
        :disabled="!newItemName.trim()"
        :loading="addShoppingListItemMutation.isLoading.value"
        icon="i-lucide-plus"
        label="Add"
        type="submit"
      />
    </form>

    <KitchenLoading
      v-if="shoppingListQuery.isPending.value"
      label="Checking your shopping list"
    />
    <UEmpty
      v-else-if="shoppingList.length === 0"
      icon="i-lucide-shopping-basket"
      title="Your list is clear"
      description="Adding planned meals will put their ingredients here."
    />
    <div
      v-else
      class="
        grid gap-6
        lg:grid-cols-2
      "
    >
      <section class="flex flex-col gap-3">
        <h2 class="text-sm font-semibold text-muted">
          To buy · {{ activeItems.length }}
        </h2>
        <div
          v-for="group in activeGroups"
          :key="group.name"
          class="flex flex-col gap-2"
        >
          <button
            :aria-expanded="!isGroupCollapsed(group.name)"
            class="
              flex w-full items-center justify-between gap-3 rounded-lg p-1
              text-left text-xs font-semibold tracking-wide text-muted uppercase
              hover:bg-elevated/70
            "
            type="button"
            @click="toggleGroup(group.name)"
          >
            <span>{{ group.name }} · {{ group.items.length }}</span>
            <UIcon
              :name="isGroupCollapsed(group.name) ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'"
              class="size-4 shrink-0"
            />
          </button>
          <AnimateHeight>
            <div
              v-if="!isGroupCollapsed(group.name)"
              class="flex flex-col gap-2"
            >
              <UPageCard
                v-for="item in group.items"
                :key="item.id"
                class="cursor-pointer"
                @click="setComplete(item.id, true)"
              >
                <div class="flex items-center gap-3">
                  <UIcon
                    name="i-lucide-circle"
                    class="size-5 text-muted"
                  />
                  <span class="flex-1 font-medium text-highlighted">{{ item.name }}</span>
                  <span
                    v-if="item.amount !== null"
                    class="text-sm text-muted"
                  >{{ item.amount }} {{ item.unit }}</span>
                  <UButton
                    aria-label="Edit shopping item"
                    color="neutral"
                    icon="i-lucide-pencil"
                    size="sm"
                    variant="ghost"
                    @click.stop="editItem(item)"
                  />
                </div>
              </UPageCard>
            </div>
          </AnimateHeight>
        </div>
      </section>
      <section class="flex flex-col gap-3">
        <h2 class="text-sm font-semibold text-muted">
          Completed · {{ completedItems.length }}
        </h2>
        <UPageCard
          v-for="item in completedItems"
          :key="item.id"
          class="cursor-pointer opacity-60"
          @click="setComplete(item.id, false)"
        >
          <div class="flex items-center gap-3">
            <UIcon
              name="i-lucide-circle-check"
              class="size-5 text-primary"
            />
            <span class="flex-1 text-muted line-through">{{ item.name }}</span>
            <span
              v-if="item.amount !== null"
              class="text-sm text-muted"
            >{{ item.amount }} {{ item.unit }}</span>
            <UButton
              aria-label="Edit shopping item"
              color="neutral"
              icon="i-lucide-pencil"
              size="sm"
              variant="ghost"
              @click.stop="editItem(item)"
            />
          </div>
        </UPageCard>
      </section>
    </div>
    <ShoppingListItemEditModal
      v-model:open="editOpen"
      :item="editingItem"
      @update="updateItem"
    />
  </PageShell>
</template>
