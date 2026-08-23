<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import { useFinalizeRecipeImportMutation } from '~/features/recipes/api/finalizeRecipeImport.mutation'
import { useRecipeImportQuery } from '~/features/recipes/api/getRecipeImport.query'
import { useRecipeFormDataQuery } from '~/features/recipes/api/listRecipeFormData.query'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

const route = useRoute()
const id = String(route.params.id)
const importQuery = useRecipeImportQuery(id)
const finalizeMutation = useFinalizeRecipeImportMutation()
const formDataQuery = useRecipeFormDataQuery()
const draft = ref<Record<string, any> | null>(null)
const activeTab = ref<'general' | 'ingredients' | 'steps'>('general')
const existingIngredientNames = computed(() => new Set(
  (formDataQuery.data.value?.ingredients || []).map((item) => item.name.toLocaleLowerCase()),
))
const newIngredientCount = computed(() => draft.value?.ingredients.filter(
  (ingredient: { name: string }) => !existingIngredientNames.value.has(ingredient.name.toLocaleLowerCase()),
).length || 0)

watch(() => importQuery.data.value?.draft, (value) => {
  if (value && !draft.value) {
    draft.value = structuredClone(value as Record<string, any>)
  }
}, {
  immediate: true,
})

async function saveDraft() {
  if (!draft.value) {
    return
  }

  const recipe = await finalizeMutation.mutateAsync({
    id,
    draft: draft.value,
  })

  await navigateTo(`/recipes/${recipe.id}/edit`)
}
</script>

<template>
  <PageShell>
    <PageHeader
      title="Review imported recipe"
      description="Tweak the draft before it creates recipes and ingredients in your library."
    >
      <template #actions>
        <UButton
          :loading="finalizeMutation.isLoading.value"
          label="Add recipe to library"
          icon="i-lucide-check"
          @click="saveDraft"
        />
      </template>
    </PageHeader>
    <AppQueryState :query="importQuery">
      <template #default>
        <div
          v-if="draft"
          class="flex flex-col gap-6"
        >
          <UTabs
            v-model="activeTab"
            :content="false"
            :items="[
              { label: 'General',
                value: 'general',
                icon: 'i-lucide-notebook-pen' },
              { label: 'Ingredients',
                value: 'ingredients',
                icon: 'i-lucide-shopping-basket',
                badge: newIngredientCount || undefined },
              { label: 'Steps',
                value: 'steps',
                icon: 'i-lucide-list-ordered' },
            ]"
            variant="link"
          />
          <template v-if="activeTab === 'general'">
            <UFormField label="Recipe name">
              <UInput
                v-model="draft.name"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Description">
              <UTextarea
                v-model="draft.description"
                :rows="3"
                class="w-full"
              />
            </UFormField>
          </template>
          <template v-else-if="activeTab === 'ingredients'">
            <div class="flex items-center justify-between gap-3">
              <h2 class="font-semibold text-highlighted">
                Ingredients
              </h2>
              <UBadge
                color="primary"
                variant="subtle"
              >
                {{ newIngredientCount }} new to your library
              </UBadge>
            </div>
            <p class="text-sm text-toned">
              Highlighted ingredients will be created only when you save this review.
            </p>
            <div class="flex flex-col gap-3">
              <UCard
                v-for="ingredient in draft.ingredients"
                :key="ingredient.name"
                :class="existingIngredientNames.has(ingredient.name.toLocaleLowerCase()) ? '' : `
                  border-primary/50 bg-primary/5
                `"
                :ui="{ body: 'p-3' }"
              >
                <div
                  v-if="!existingIngredientNames.has(ingredient.name.toLocaleLowerCase())"
                  class="
                    mb-2 flex items-center gap-1 text-xs font-medium
                    text-primary
                  "
                >
                  <UIcon name="i-lucide-sparkles" /> New ingredient
                </div>
                <div
                  class="
                    grid gap-2
                    sm:grid-cols-[minmax(0,1fr)_7rem_6rem]
                  "
                >
                  <UInput v-model="ingredient.name" />
                  <UInput
                    v-model.number="ingredient.amount"
                    type="number"
                    placeholder="Amount"
                  />
                  <UInput
                    v-model="ingredient.unit"
                    placeholder="Unit"
                  />
                </div>
              </UCard>
            </div>
          </template>
          <template v-else>
            <div class="flex flex-col gap-3">
              <h2 class="font-semibold text-highlighted">
                Steps
              </h2>
              <UCard
                v-for="(step, index) in draft.steps"
                :key="index"
                :ui="{ body: 'p-3' }"
              >
                <UTextarea
                  v-model="step.instruction"
                  :rows="3"
                  class="w-full"
                />
              </UCard>
            </div>
          </template>
        </div>
      </template>
    </AppQueryState>
  </PageShell>
</template>
