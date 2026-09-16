<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import { useAddShoppingListItemMutation } from '~/features/meal-planner/api/addShoppingListItem.mutation'
import { useClearCompletedShoppingListItemsMutation } from '~/features/meal-planner/api/clearCompletedShoppingListItems.mutation'
import { useShoppingListQuery } from '~/features/meal-planner/api/listShoppingList.query'
import { useSetShoppingListItemCompleteMutation } from '~/features/meal-planner/api/setShoppingListItemComplete.mutation'
import ShoppingListItemEditModal from '~/features/meal-planner/components/ShoppingListItemEditModal.vue'
import { compareShoppingGroups } from '~/features/meal-planner/utils/shoppingListOrder'

definePageMeta({
  layout: 'kitchen',
  middleware: 'auth',
  viewTransition: true,
})

const shoppingListQuery = useShoppingListQuery()
const addShoppingListItemMutation = useAddShoppingListItemMutation()
const clearCompletedShoppingListItemsMutation = useClearCompletedShoppingListItemsMutation()
const updateCompleteMutation = useSetShoppingListItemCompleteMutation()
const newItemName = ref('')

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

async function toggleItem(id: string, completed: boolean) {
  const previous = shoppingList.value

  localShoppingList.value = shoppingList.value.map((item) => item.id === id
    ? {
        ...item,
        completedAt: completed ? new Date() : null,
      }
    : item)

  try {
    await updateCompleteMutation.mutateAsync({
      id,
      completed,
    })
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

async function clearCompletedItems() {
  const previous = shoppingList.value

  localShoppingList.value = activeItems.value

  try {
    await clearCompletedShoppingListItemsMutation.mutateAsync()
  }
  catch {
    localShoppingList.value = previous
  }
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
  <div
    class="
      mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 pt-6
      sm:px-6
      md:max-w-6xl md:px-8 md:pt-10
    "
  >
    <div class="flex flex-col gap-1">
      <h1
        class="
          text-[2.15rem] leading-none font-bold tracking-tight text-highlighted
        "
      >
        Shopping list
      </h1>
      <p class="text-sm text-muted">
        Tap an item once it is in your basket.
      </p>
    </div>

    <form
      class="
        flex items-center gap-2 rounded-2xl bg-elevated p-2 shadow-sm ring-1
        ring-default
      "
      @submit.prevent="addItem"
    >
      <UInput
        v-model="newItemName"
        class="flex-1"
        icon="i-lucide-plus"
        placeholder="Add an item"
        size="xl"
      />
      <UButton
        :disabled="!newItemName.trim()"
        :loading="addShoppingListItemMutation.isLoading.value"
        icon="i-lucide-plus"
        label="Add"
        size="xl"
        type="submit"
      />
    </form>

    <KitchenAsyncState :pending="shoppingListQuery.isPending.value">
      <template #loading>
        <KitchenLoading label="Checking the pantry" />
      </template>
      <UEmpty
        v-if="shoppingList.length === 0"
        icon="i-lucide-shopping-basket"
        title="Nothing to buy"
        description="Add meals to create your first shopping list."
      />
      <div
        v-else
        class="
          flex flex-col gap-6
          md:grid md:grid-cols-2 md:items-start
        "
      >
        <section class="flex flex-col gap-2">
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
                text-left text-xs font-semibold tracking-wide text-muted
                uppercase
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
                  class="
                    cursor-pointer rounded-2xl shadow-sm ring-1 ring-default
                  "
                  @click="toggleItem(item.id, true)"
                >
                  <div class="flex items-center gap-3">
                    <UIcon
                      name="i-lucide-circle"
                      class="size-5 shrink-0 text-muted"
                    />
                    <span class="min-w-0 flex-1 font-medium text-highlighted">{{ item.name }}</span>
                    <span
                      v-if="item.amount !== null"
                      class="shrink-0 text-sm text-muted"
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
        <section
          v-if="completedItems.length > 0"
          class="flex flex-col gap-2"
        >
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-sm font-semibold text-muted">
              In the basket · {{ completedItems.length }}
            </h2>
            <UButton
              color="neutral"
              icon="i-lucide-trash-2"
              label="Clear"
              size="xs"
              variant="ghost"
              @click="clearCompletedItems"
            />
          </div>
          <UPageCard
            v-for="item in completedItems"
            :key="item.id"
            class="
              cursor-pointer rounded-2xl opacity-60 shadow-sm ring-1
              ring-default
            "
            @click="toggleItem(item.id, false)"
          >
            <div class="flex items-center gap-3">
              <UIcon
                name="i-lucide-circle-check"
                class="size-5 shrink-0 text-primary"
              />
              <span class="min-w-0 flex-1 text-muted line-through">{{ item.name }}</span>
              <span
                v-if="item.amount !== null"
                class="shrink-0 text-sm text-muted"
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
    </KitchenAsyncState>
    <ShoppingListItemEditModal
      v-model:open="editOpen"
      :item="editingItem"
      @update="updateItem"
    />
  </div>
</template>
