<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import type { DropdownMenuItem } from '@nuxt/ui'

import { useSignOutMutation } from '~/features/auth/api/signOut.mutation'
import KitchenSettingsModal from '~/features/settings/components/KitchenSettingsModal.vue'
import { authClient } from '~/lib/authClient'

const open = ref(true)
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
    icon: 'i-lucide-chef-hat',
    label: 'Kitchen mode',
    to: '/kitchen',
  },
  {
    icon: 'i-lucide-history',
    label: 'Cooking history',
    to: '/history',
  },
  {
    disabled: true,
    icon: 'i-lucide-calendar-heart',
    label: 'Meal plans',
  },
]

const userItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      icon: 'i-lucide-settings-2',
      label: 'Kitchen settings',
      onSelect: openKitchenSettings,
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
  <div class="flex min-h-dvh bg-muted/30">
    <USidebar
      v-model:open="open"
      :ui="{ inner: 'border-r border-default bg-default' }"
      collapsible="icon"
      rail
    >
      <template #header>
        <NuxtLink
          to="/dashboard"
          class="
            flex items-center gap-3 text-sm font-bold tracking-tight
            text-highlighted
          "
        >
          <span
            class="
              grid size-9 place-items-center rounded-xl bg-primary text-inverted
              shadow-sm
            "
          >
            <UIcon
              name="i-lucide-chef-hat"
              class="size-5"
            />
          </span>
          <span class="whitespace-nowrap">Recipe Organiser</span>
        </NuxtLink>
      </template>

      <template #default>
        <div class="flex flex-col gap-5 px-2 py-3">
          <UNavigationMenu
            :items="navigation"
            :ui="{ link: 'rounded-xl px-3 py-2.5' }"
            orientation="vertical"
          />

          <div class="rounded-xl bg-primary/8 p-3 text-sm text-toned">
            <UIcon
              name="i-lucide-tablet"
              class="mb-2 size-5 text-primary"
            />
            <p class="font-medium text-highlighted">
              Kitchen mode, soon.
            </p>
            <p class="mt-1 text-xs/5">
              A focused, step-by-step cooking view for the iPad.
            </p>
          </div>
        </div>
      </template>

      <template #footer>
        <UDropdownMenu :items="userItems">
          <UButton
            v-bind="user"
            :label="user.name"
            color="neutral"
            variant="ghost"
            trailing-icon="i-lucide-chevrons-up-down"
            class="w-full"
            square
          />
        </UDropdownMenu>
      </template>
    </USidebar>

    <div class="flex min-w-0 flex-1 flex-col">
      <header
        class="
          flex h-(--ui-header-height) items-center border-b border-default
          bg-default px-4
          sm:px-6
        "
      >
        <UButton
          class="lg:hidden"
          color="neutral"
          variant="ghost"
          icon="i-lucide-menu"
          aria-label="Open navigation"
          @click="() => { open = true }"
        />
        <div
          id="dashboard-page-breadcrumbs"
          class="ml-2 min-w-0"
        />
        <div
          id="dashboard-page-actions"
          class="ml-auto flex items-center gap-2"
        />
      </header>
      <main
        class="
          flex-1 p-4
          sm:p-6
          lg:p-8
        "
      >
        <slot />
      </main>
    </div>
  </div>
</template>
