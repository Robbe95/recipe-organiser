<script setup lang="ts">
/* eslint-disable better-tailwindcss/no-unknown-classes */
import type { DropdownMenuItem } from '@nuxt/ui'

import { useSignOutMutation } from '~/features/auth/api/signOut.mutation'
import KitchenSettingsModal from '~/features/settings/components/KitchenSettingsModal.vue'
import { authClient } from '~/lib/authClient'

const route = useRoute()
const fullScreen = computed(() => route.meta.fullScreen === true)
const signOutMutation = useSignOutMutation()
const session = authClient.useSession()
const overlay = useOverlay()
const kitchenSettingsModal = overlay.create(KitchenSettingsModal)

const user = computed(() => ({
  name: session.value.data?.user.name || 'Kitchen account',
  avatar: {
    alt: session.value.data?.user.name || 'Kitchen account',
    src: session.value.data?.user.image || undefined,
  },
}))

const navigation = [
  {
    icon: 'i-lucide-notebook-tabs',
    label: 'My recipes',
    to: '/dashboard',
  },
  {
    icon: 'i-lucide-shopping-basket',
    label: 'Ingredients',
    to: '/ingredients',
  },
  {
    icon: 'i-lucide-calendar-heart',
    label: 'Meal plan',
    to: '/meal-plan',
  },
  {
    icon: 'i-lucide-shopping-basket',
    label: 'Shopping list',
    to: '/shopping-list',
  },
]
const collapsedNavigationUi = {
  link: 'mx-auto size-10 justify-center p-0 before:inset-0',
}

const userItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      icon: 'i-lucide-settings-2',
      label: 'Kitchen settings',
      onSelect: openKitchenSettings,
    },
    {
      icon: 'i-lucide-inbox',
      label: 'Pending imports',
      to: '/recipes/imports',
    },
    {
      icon: 'i-lucide-history',
      label: 'Cooking history',
      to: '/history',
    },
  ],
  [
    {
      icon: 'i-lucide-log-out',
      label: 'Log out',
      onSelect: signOut,
    },
  ],
])

function openKitchenSettings() {
  void kitchenSettingsModal.open()
}

async function signOut() {
  await signOutMutation.mutateAsync()
  await navigateTo('/')
}
</script>

<template>
  <UDashboardGroup
    storage-key="recipe-dashboard"
    unit="rem"
    class="app-surface bg-muted/20"
  >
    <UDashboardSidebar
      id="navigation"
      :default-size="16"
      :min-size="14"
      :max-size="20"
      :collapsed-size="4"
      :ui="{ header: 'px-2',
             body: 'px-2',
             footer: 'px-2 border-t border-default' }"
      class="
        dashboard-glass border-r bg-default/70 transition-[width] duration-200
        ease-in-out
        motion-reduce:transition-none
      "
      collapsible
    >
      <template #header="{ collapsed }">
        <UButton
          :label="collapsed ? undefined : 'Recipe Organiser'"
          :square="collapsed"
          :ui="{ leadingIcon: 'text-primary',
                 label: 'truncate' }"
          :class="collapsed ? 'mx-auto font-semibold whitespace-nowrap' : `
            w-full font-semibold whitespace-nowrap
          `"
          to="/dashboard"
          icon="i-lucide-chef-hat"
          aria-label="Recipe Organiser home"
          color="neutral"
          variant="ghost"
        />
      </template>
      <template #default="{ collapsed }">
        <UNavigationMenu
          :items="navigation"
          :collapsed="collapsed"
          :ui="collapsed ? collapsedNavigationUi : undefined"
          orientation="vertical"
          tooltip
          popover
        />
        <UNavigationMenu
          :items="[{ label: 'Kitchen mode',
                     icon: 'i-lucide-chef-hat',
                     to: '/kitchen' }]"
          :collapsed="collapsed"
          :ui="collapsed ? collapsedNavigationUi : undefined"
          orientation="vertical"
          class="mt-auto"
          tooltip
        />
      </template>
      <template #footer="{ collapsed }">
        <UDropdownMenu
          :items="userItems"
          :content="{ side: collapsed ? 'right' : 'top',
                      align: 'end' }"
          :ui="{ content: 'w-56' }"
        >
          <UButton
            :label="collapsed ? undefined : user.name"
            :aria-label="`${user.name} account menu`"
            :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
            :square="collapsed"
            :ui="{ label: 'truncate',
                   trailingIcon: 'ml-auto' }"
            :class="collapsed ? 'mx-auto whitespace-nowrap' : `
              w-full whitespace-nowrap
            `"
            icon="i-lucide-circle-user-round"
            color="neutral"
            variant="ghost"
          />
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>
    <UDashboardPanel
      id="content"
      :ui="{ body: fullScreen ? 'min-h-0 gap-0 overflow-hidden p-0 sm:p-0 sm:gap-0' : 'min-h-0 lg:p-8' }"
    >
      <template #header>
        <UDashboardNavbar class="dashboard-glass border-b bg-default/65">
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>
          <template #title>
            <div
              id="dashboard-page-breadcrumbs"
              class="min-w-0"
            />
          </template>
          <template #right>
            <div
              id="dashboard-page-actions"
              class="flex items-center gap-2"
            />
          </template>
        </UDashboardNavbar>
      </template>
      <template #body>
        <slot />
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
