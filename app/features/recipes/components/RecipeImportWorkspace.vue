<script setup lang="ts">
/* eslint-disable @intlify/vue-i18n/no-raw-text */
import { useQueryCache } from '@pinia/colada'
import { useIntervalFn } from '@vueuse/core'

import ConfirmDeleteModal from '~/components/ConfirmDeleteModal.vue'
import {
  client,
  orpc,
} from '~/lib/orpc'

import type { ImportedRecipe } from '../../../../shared/recipeImport'
import {
  importedRecipeSchema,
  parseImportedRecipe,
} from '../../../../shared/recipeImport'
import { buildIngredientLookup } from '../../../../shared/utils/ingredientAliases'
import { ingredientLibraryKey } from '../../../../shared/utils/ingredientLibraryKey'
import { useRecipeFormDataQuery } from '../api/listRecipeFormData.query'
import RecipeImportModal from './RecipeImportModal.vue'

const props = defineProps<{ initialId?: string }>()

type Job = Awaited<ReturnType<typeof client.recipes.listRecipeImports>>[number]
const jobs = ref<Job[]>([])
const removedIds = new Set<string>()
const selectedId = ref(props.initialId || '')
const draft = ref<ImportedRecipe | null>(null)
const sourceImageUrl = ref<string | null>(null)
const savedSnapshot = ref('')
const loading = ref(true)
const loadedId = ref('')
let refreshing = false
const busy = ref(false)
const switching = ref(false)
const error = ref('')
const search = ref('')
const inboxTab = ref('pending')
const detailTab = ref('recipe')
const expandedIngredient = ref<number | null>(null)
const formData = useRecipeFormDataQuery()
const queryCache = useQueryCache()
const overlay = useOverlay()
const importModal = overlay.create(RecipeImportModal)
const removeModal = overlay.create(ConfirmDeleteModal)
const selected = computed(() => jobs.value.find((job) => job.id === selectedId.value))
const dirty = computed(() => Boolean(draft.value) && JSON.stringify(draft.value) !== savedSnapshot.value)
const pending = computed(() => jobs.value.filter((job) => job.status !== 'completed'))
const visibleJobs = computed(() => jobs.value.filter((job) => (inboxTab.value === 'pending' ? job.status !== 'completed' : job.status === 'completed')
  && jobName(job).toLocaleLowerCase().includes(search.value.toLocaleLowerCase())))
const library = computed(() => buildIngredientLookup(formData.data.value?.ingredients || []))
const aliasTargets = ref<Record<number, string>>({})
const newNames = computed(() => new Set((draft.value?.ingredients || [])
  .filter((item) => !library.value.has(ingredientLibraryKey(item.name)))
  .map((item) => ingredientLibraryKey(item.name))))
const reusedNames = computed(() => new Set((draft.value?.ingredients || [])
  .filter((item) => library.value.has(ingredientLibraryKey(item.name)))
  .map((item) => library.value.get(ingredientLibraryKey(item.name))!.id)))
const reviewIngredients = computed(() => (draft.value?.ingredients || [])
  .map((ingredient, index) => ({
    index,
    ingredient,
  }))
  .sort((left, right) => Number(library.value.has(ingredientLibraryKey(left.ingredient.name)))
    - Number(library.value.has(ingredientLibraryKey(right.ingredient.name))) || left.index - right.index))
const units: NonNullable<ImportedRecipe['ingredients'][number]['unit']>[] = [
  'g',
  'kg',
  'ml',
  'l',
  'tsp',
  'tbsp',
  'amount',
  'can',
  'package',
]
const statusLabels: Record<string, string> = {
  completed: 'Added to library',
  failed: 'Import failed',
  processing: 'Extracting recipe',
  queued: 'Queued',
  review: 'Ready for review',
  saving: 'Adding to library',
}

function jobName(job: Job) {
  return (job.draft as ImportedRecipe | null)?.name || job.sourceUrl || `${job.imageId ? 'Image recipe' : 'Text recipe'} · ${job.id.slice(0, 6)}`
}

function match(name: string) {
  return library.value.get(ingredientLibraryKey(name))
}

function firstIngredientIndex(name: string) {
  const key = ingredientLibraryKey(name)

  return draft.value?.ingredients.findIndex((item) => ingredientLibraryKey(item.name) === key) ?? -1
}

function ingredientOutcome(name: string, index: number) {
  const existing = match(name)
  const first = firstIngredientIndex(name)

  if (!existing && first < index) {
    return `Reuse new ${name} from row ${first + 1} · same Generic nutrition`
  }

  return existing ? `Reuse ${existing.name}${ingredientLibraryKey(name) !== ingredientLibraryKey(existing.name) ? ' (alias)' : ''} · existing nutrition stays unchanged` : 'Create new ingredient · Generic nutrition'
}

function message(cause: unknown) {
  return cause instanceof Error ? cause.message : 'Something went wrong. Please try again.'
}

function sourceLabel(job: Job) {
  if (job.imageId) {
    return 'Image'
  }

  return job.sourceUrl ? 'Website' : 'Pasted text'
}

function dateLabel(value: string | Date) {
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  })
}

async function loadSelected() {
  const requestedId = selectedId.value

  if (!selectedId.value) {
    return
  }
  const job = await client.recipes.getRecipeImport({
    id: selectedId.value,
  })

  if (requestedId !== selectedId.value) {
    return
  }

  aliasTargets.value = {}
  loadedId.value = requestedId
  sourceImageUrl.value = job.sourceImageUrl
  draft.value = job.status === 'review' ? parseImportedRecipe(job.draft) : null
  savedSnapshot.value = JSON.stringify(draft.value)
}

async function refresh() {
  if (refreshing) {
    return
  }

  refreshing = true

  try {
    const latest = await client.recipes.listRecipeImports()
    const before = selected.value?.status

    jobs.value = latest.filter((job) => !removedIds.has(job.id))

    if (!selectedId.value || (!selected.value && !dirty.value)) {
      selectedId.value = visibleJobs.value[0]?.id || ''
    }
    const needsDraft = loadedId.value !== selectedId.value || !before || before !== selected.value?.status

    if (selectedId.value && needsDraft && !dirty.value && !busy.value && !switching.value) {
      await loadSelected()
    }
  }
  catch (error_) {
    error.value = message(error_)
  }
  finally {
    loading.value = false
    refreshing = false
  }
}

function nullableNumber(value: number | string | null | undefined) {
  return value === '' || value === null || value === undefined ? null : Number(value)
}

function validatedDraft() {
  const result = importedRecipeSchema.safeParse(draft.value)

  if (!result.success) {
    const issue = result.error.issues[0]

    error.value = `Check ${issue?.path.join(' → ') || 'the recipe'}: ${issue?.message || 'invalid value'}`

    return null
  }

  return result.data
}

async function save() {
  if (!draft.value || !dirty.value) {
    return true
  }

  if (!validatedDraft()) {
    return false
  }

  busy.value = true

  try {
    const snapshot = JSON.stringify(draft.value)

    await client.recipes.saveRecipeImportDraft({
      id: selectedId.value,
      draft: JSON.parse(snapshot),
    })
    savedSnapshot.value = snapshot

    const job = selected.value

    if (job) {
      job.draft = JSON.parse(snapshot)
    }

    error.value = ''

    return true
  }
  catch (error_) {
    error.value = `Draft could not be saved. ${message(error_)}`

    return false
  }
  finally {
    busy.value = false
  }
}

async function selectJob(job: Job) {
  if (busy.value || switching.value || job.id === selectedId.value) {
    return
  }

  switching.value = true

  try {
    if (!await save()) {
      return
    }

    selectedId.value = job.id
    draft.value = null
    sourceImageUrl.value = null
    expandedIngredient.value = null
    aliasTargets.value = {}
    await loadSelected()
  }
  catch (error_) {
    error.value = message(error_)
  }
  finally {
    switching.value = false
  }
}

async function importRecipes() {
  const id = await importModal.open()

  if (!id) {
    return
  }

  await refresh()
  inboxTab.value = 'pending'

  const job = jobs.value.find((item) => item.id === id)

  if (job) {
    await selectJob(job)
  }
}

async function finalize() {
  if (!draft.value || busy.value) {
    return
  }

  if (!validatedDraft()) {
    return
  }

  busy.value = true

  try {
    await client.recipes.finalizeRecipeImport({
      id: selectedId.value,
      draft: draft.value,
    })
    savedSnapshot.value = JSON.stringify(draft.value)
    draft.value = null
    await Promise.all([
      formData.refetch(),
      queryCache.invalidateQueries({
        key: orpc.recipes.listRecipes.key(),
      }),
    ])
    busy.value = false
    await refresh()

    const next = pending.value.find((job) => job.status === 'review') || pending.value[0]

    if (next) {
      await selectJob(next)
    }
  }
  catch (error_) {
    error.value = message(error_)
  }
  finally {
    busy.value = false
  }
}

async function rememberAlias(index: number) {
  const source = draft.value?.ingredients[index]
  const targetId = aliasTargets.value[index]

  if (!source || !targetId || busy.value) {
    return
  }

  busy.value = true

  try {
    await client.recipes.addIngredientAlias({
      id: targetId,
      alias: source.name,
    })
    await formData.refetch()
    error.value = ''
    delete aliasTargets.value[index]
  }
  catch (error_) { error.value = message(error_) }
  finally { busy.value = false }
}

async function removeImport() {
  const job = selected.value

  if (!job || busy.value || switching.value) {
    return
  }
  const confirmed = await removeModal.open({
    title: 'Remove pending import?',
    description: `Remove “${jobName(job)}” and its draft, including any unsaved edits? This cannot be undone.`,
  })

  if (!confirmed || busy.value || switching.value) {
    return
  }

  busy.value = true

  try {
    await client.recipes.removeRecipeImport({
      id: job.id,
    })
    removedIds.add(job.id)
    jobs.value = jobs.value.filter((item) => item.id !== job.id)
    error.value = ''

    if (selectedId.value === job.id) {
      draft.value = null
      savedSnapshot.value = ''
      sourceImageUrl.value = null
      loadedId.value = ''
      expandedIngredient.value = null
      selectedId.value = visibleJobs.value[0]?.id || ''

      if (selectedId.value) {
        await loadSelected()
      }
    }
  }
  catch (error_) {
    error.value = message(error_)
  }
  finally {
    busy.value = false
  }
}

async function retry() {
  if (!selected.value) {
    return
  }

  busy.value = true

  try {
    await client.recipes.retryRecipeImport({
      id: selectedId.value,
    })
    await refresh()
  }
  catch (error_) {
    error.value = message(error_)
  }
  finally {
    busy.value = false
  }
}

function removeIngredient(index: number) {
  draft.value?.ingredients.splice(index, 1)
  aliasTargets.value = {}
  expandedIngredient.value = null
}

function addIngredient() {
  draft.value?.ingredients.push({
    isOptional: false,
    isPantryStaple: false,
    name: '',
    amount: null,
    calorieAmount: 100,
    calories: 0,
    category: null,
    defaultUnit: 'g',
    groupName: null,
    note: null,
    nutritionUnit: 'g',
    requiresWeight: false,
    unit: 'g',
  })
  expandedIngredient.value = (draft.value?.ingredients.length || 1) - 1
}

function moveStep(index: number, direction: number) {
  if (!draft.value) {
    return
  }
  const target = index + direction

  if (target < 0 || target >= draft.value.steps.length) {
    return
  }
  const [
    step,
  ] = draft.value.steps.splice(index, 1)

  if (step) {
    draft.value.steps.splice(target, 0, step)
  }
}

onMounted(refresh)
useIntervalFn(() => {
  if (!busy.value && !switching.value) {
    void refresh()
  }
}, 4000)
onBeforeRouteLeave(async () => !busy.value && !switching.value && await save())

function beforeUnload(event: BeforeUnloadEvent) {
  if (dirty.value) {
    event.preventDefault()
  }
}

onMounted(() => window.addEventListener('beforeunload', beforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
</script>

<template>
  <PageShell class="h-full min-h-0 gap-0">
    <PageHeader
      :breadcrumbs="[{ label: 'Recipes',
                       to: '/dashboard' }, { label: 'Imports' }]"
      title="Recipe imports"
      description="Review the recipe. Know what changes. Add it when it’s ready."
      compact
    >
      <template #actions>
        <UButton
          label="Import recipes"
          icon="i-lucide-plus"
          color="neutral"
          variant="outline"
          @click="importRecipes"
        />
        <UButton
          v-if="draft"
          :disabled="busy || switching || !formData.data.value"
          :loading="busy"
          label="Add to library"
          icon="i-lucide-check"
          @click="finalize"
        />
      </template>
    </PageHeader>
    <div class="flex min-h-0 flex-1 overflow-hidden bg-default">
      <div
        class="
          grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)]
          lg:grid-cols-[18rem_minmax(0,1fr)] lg:grid-rows-1
        "
      >
        <aside
          class="
            flex min-h-0 flex-col border-b border-default bg-muted/20
            lg:border-r lg:border-b-0
          "
        >
          <div class="flex shrink-0 flex-col gap-3 border-b border-default p-4">
            <h2 class="text-sm font-semibold">
              Imports
            </h2>
            <UTabs
              v-model="inboxTab"
              :content="false"
              :items="[{ label: 'Pending',
                         value: 'pending',
                         badge: pending.length }, { label: 'Completed',
                                                    value: 'completed' }]"
              size="sm"
            />
            <UInput
              v-model="search"
              icon="i-lucide-search"
              placeholder="Find an import…"
              aria-label="Search imports"
              class="w-full"
            />
          </div>
          <div
            class="
              max-h-48 overflow-y-auto p-2
              lg:max-h-none lg:min-h-0 lg:flex-1
            "
          >
            <p
              v-if="loading"
              class="p-4 text-sm text-muted"
            >
              Loading imports…
            </p>
            <p
              v-else-if="visibleJobs.length === 0"
              class="p-4 text-sm text-muted"
            >
              {{ search ? 'No matching imports.' : inboxTab === 'pending' ? 'All caught up. Import a few recipes to get started.' : 'Completed imports appear here.' }}
            </p>
            <button
              v-for="job in visibleJobs"
              :key="job.id"
              :disabled="busy || switching"
              :aria-current="selectedId === job.id ? 'true' : undefined"
              :class="selectedId === job.id ? `bg-elevated ring-1 ring-default` : ''"
              type="button"
              class="
                mb-1 flex w-full items-start gap-2.5 rounded-md p-3 text-left
                transition-colors
                hover:bg-elevated
              "
              @click="selectJob(job)"
            >
              <UIcon
                :name="job.status === 'failed' ? 'i-lucide-circle-alert' : job.status === 'review' ? 'i-lucide-circle-dot' : job.status === 'completed' ? 'i-lucide-circle-check' : 'i-lucide-loader-circle'"
                :class="[
                  job.status === 'failed' ? 'text-error' : job.status === 'review' ? `
                    text-primary
                  ` : `text-muted`,
                  ['queued', 'processing', 'saving'].includes(job.status) ? `
                    animate-spin
                  ` : '',
                ]"
                class="mt-0.5 size-4 shrink-0"
              />
              <div class="min-w-0 flex-1">
                <p
                  class="truncate text-sm font-medium"
                >
                  {{ jobName(job) }}
                </p><p
                  class="mt-1 text-xs text-muted"
                >
                  {{ statusLabels[job.status] || job.status }}
                </p><p
                  class="mt-1 truncate text-xs text-dimmed"
                >
                  {{ sourceLabel(job) }} · {{ dateLabel(job.createdAt) }}
                </p>
              </div>
            </button>
          </div>
        </aside>
        <div class="min-h-0 min-w-0 overflow-y-auto overscroll-contain">
          <div
            v-if="error"
            role="alert"
            class="
              flex items-center justify-between gap-3 border-b border-error/20
              bg-error/5 px-6 py-3 text-sm text-error
            "
          >
            {{ error }}<UButton
              label="Retry loading"
              color="error"
              variant="ghost"
              @click="refresh"
            />
          </div>
          <div
            v-if="switching"
            class="p-12 text-center text-sm text-muted"
          >
            Loading draft…
          </div>
          <template v-else-if="selected">
            <div
              class="
                flex flex-wrap items-center justify-between gap-3 border-b
                border-default px-6 py-4
              "
            >
              <div>
                <p class="text-xs font-medium text-muted">
                  {{ sourceLabel(selected) }} import
                </p><h2
                  class="mt-1 text-lg font-semibold"
                >
                  {{ draft?.name || jobName(selected) }}
                </h2>
              </div>
              <div class="flex items-center gap-2">
                <UButton
                  v-if="['queued', 'processing', 'review', 'failed'].includes(selected.status)"
                  :disabled="busy || switching"
                  label="Remove import"
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  @click="removeImport"
                />
                <span
                  v-if="draft"
                  class="text-xs text-muted"
                >{{ dirty ? 'Unsaved changes' : 'Draft saved' }}</span><UButton
                  v-if="draft"
                  :disabled="!dirty || busy"
                  label="Save draft"
                  color="neutral"
                  variant="ghost"
                  @click="save"
                /><UBadge
                  color="neutral"
                  variant="subtle"
                >
                  {{ statusLabels[selected.status] || selected.status }}
                </UBadge>
              </div>
            </div>
            <template v-if="draft">
              <div
                class="
                  flex flex-wrap gap-x-6 gap-y-2 border-b border-default
                  bg-muted/20 px-6 py-3 text-xs
                "
              >
                <span><strong class="text-highlighted">1</strong> new recipe</span>
                <span><strong
                  class="text-primary"
                >{{ newNames.size }}</strong> new ingredients</span>
                <span><strong>{{ reusedNames.size }}</strong> reused ingredients</span>
                <span><strong>{{ draft.steps.length }}</strong> cooking steps</span>
              </div>
              <div class="px-6 pt-2">
                <UTabs
                  v-model="detailTab"
                  :content="false"
                  :items="[{ label: 'Recipe',
                             value: 'recipe' }, { label: 'Ingredients',
                                                  value: 'ingredients',
                                                  badge: draft.ingredients.length }, { label: 'Instructions',
                                                                                       value: 'steps',
                                                                                       badge: draft.steps.length }, { label: 'Source',
                                                                                                                      value: 'source' }]"
                  variant="link"
                />
              </div>
              <fieldset
                :disabled="busy"
                class="min-w-0 p-6"
              >
                <div
                  v-if="detailTab === 'recipe'"
                  class="flex max-w-3xl flex-col gap-5"
                >
                  <UFormField label="Recipe name">
                    <UInput
                      v-model="draft.name"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField label="Description">
                    <UTextarea
                      :model-value="draft.description ?? undefined"
                      :rows="3"
                      class="w-full"
                      @update:model-value="draft.description = $event || null"
                    />
                  </UFormField>
                  <div
                    class="
                      grid grid-cols-1 gap-4
                      sm:grid-cols-3
                    "
                  >
                    <UFormField label="Portions">
                      <UInput
                        v-model.number="draft.defaultPortions"
                        type="number"
                        min="1"
                        max="100"
                        class="w-full"
                      />
                    </UFormField>
                    <UFormField label="Prep time (min)">
                      <UInput
                        :model-value="draft.prepTimeMinutes"
                        type="number"
                        min="0"
                        max="1440"
                        class="w-full"
                        @update:model-value="draft.prepTimeMinutes = nullableNumber($event)"
                      />
                    </UFormField>
                    <UFormField label="Cook time (min)">
                      <UInput
                        :model-value="draft.cookTimeMinutes"
                        type="number"
                        min="0"
                        max="1440"
                        class="w-full"
                        @update:model-value="draft.cookTimeMinutes = nullableNumber($event)"
                      />
                    </UFormField>
                  </div>
                  <UFormField label="Cuisine">
                    <UInput
                      :model-value="draft.cuisine ?? undefined"
                      class="w-full"
                      @update:model-value="draft.cuisine = $event || null"
                    />
                  </UFormField>
                  <UFormField
                    label="Tags"
                    description="Separate tags with commas."
                  >
                    <UInput
                      :model-value="draft.tags.join(', ')"
                      class="w-full"
                      @change="draft.tags = ($event.target as HTMLInputElement).value.split(',').map(value => value.trim()).filter(Boolean)"
                    />
                  </UFormField>
                  <div
                    class="
                      rounded-lg border border-default p-4 text-sm text-toned
                    "
                  >
                    <p
                      class="font-medium text-highlighted"
                    >
                      When you add this recipe
                    </p><p
                      class="mt-2"
                    >
                      The recipe, its quantities and instructions will be saved to your library.
                      Existing ingredients keep their nutrition. New ingredients get a Generic nutrition variant
                      — review the estimates in Ingredients.
                    </p><p
                      class="mt-2 text-xs text-muted"
                    >
                      Edits are saved when you switch imports or leave this page. Use Save draft to save now.
                    </p>
                  </div>
                </div>
                <div
                  v-else-if="detailTab === 'ingredients'"
                  class="flex flex-col gap-4"
                >
                  <div class="flex items-center justify-between gap-3">
                    <p
                      class="text-sm text-muted"
                    >
                      New ingredients first. Expand a row to check nutrition and details.
                    </p><UButton
                      label="Add ingredient"
                      icon="i-lucide-plus"
                      color="neutral"
                      variant="ghost"
                      @click="addIngredient"
                    />
                  </div>
                  <datalist id="import-ingredient-library">
                    <option
                      v-for="item in formData.data.value?.ingredients || []"
                      :key="item.id"
                      :value="item.name"
                    />
                  </datalist>
                  <div
                    class="
                      divide-y divide-default rounded-lg border border-default
                    "
                  >
                    <div
                      v-for="{ ingredient, index } in reviewIngredients"
                      :key="index"
                      class="p-3"
                    >
                      <div
                        class="
                          grid grid-cols-[2rem_minmax(0,1fr)_5rem_5rem_2rem]
                          items-center gap-2
                        "
                      >
                        <UButton
                          :icon="expandedIngredient === index ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                          :aria-label="`Details for ${ingredient.name || 'ingredient'}`"
                          :aria-expanded="expandedIngredient === index"
                          color="neutral"
                          variant="ghost"
                          @click="expandedIngredient = expandedIngredient === index ? null : index"
                        />
                        <UInput
                          v-model="ingredient.name"
                          :aria-label="`Ingredient ${index + 1} name`"
                          list="import-ingredient-library"
                          placeholder="Ingredient name"
                          class="w-full"
                        />
                        <UInput
                          :model-value="ingredient.amount"
                          type="number"
                          min="0"
                          step="any"
                          aria-label="Amount"
                          class="w-full"
                          @update:model-value="ingredient.amount = nullableNumber($event)"
                        />
                        <USelect
                          :model-value="ingredient.unit ?? undefined"
                          :items="units"
                          aria-label="Unit"
                          class="w-full"
                          @update:model-value="ingredient.unit = $event as ImportedRecipe['ingredients'][number]['unit']"
                        />
                        <UButton
                          :aria-label="`Remove ${ingredient.name}`"
                          icon="i-lucide-x"
                          color="neutral"
                          variant="ghost"
                          @click="removeIngredient(index)"
                        />
                      </div>
                      <p
                        :class="match(ingredient.name) ? 'text-muted' : `
                          text-primary
                        `"
                        class="mt-1.5 ml-10 text-xs"
                      >
                        {{ ingredientOutcome(ingredient.name, index) }}
                        <span v-if="ingredient.groupName"> · {{ ingredient.groupName }}</span>
                        <span v-if="ingredient.isOptional"> · Optional</span>
                      </p>
                      <div
                        v-if="!match(ingredient.name) && ingredient.name.trim()"
                        class="mt-3 ml-10 flex flex-col gap-2"
                      >
                        <div class="flex flex-wrap items-center gap-2">
                          <USelectMenu
                            v-model="aliasTargets[index]"
                            :items="formData.data.value?.ingredients || []"
                            value-key="id"
                            label-key="name"
                            placeholder="Already in your library? Match to…"
                            aria-label="Match to an existing ingredient"
                            class="min-w-0 flex-1"
                            clear
                            @clear="delete aliasTargets[index]"
                          />
                          <UButton
                            :disabled="!aliasTargets[index] || busy"
                            label="Save alias"
                            icon="i-lucide-link"
                            color="neutral"
                            variant="outline"
                            @click="rememberAlias(index)"
                          />
                        </div>
                        <p
                          v-if="aliasTargets[index]"
                          class="text-xs text-muted"
                        >
                          Save “{{ ingredient.name }}” as another name for the selected ingredient,
                          for this and future imports.
                        </p>
                      </div>
                      <div
                        v-if="expandedIngredient === index"
                        class="
                          mt-4 ml-10 flex flex-col gap-4 border-t border-default
                          pt-4
                        "
                      >
                        <div
                          class="
                            grid gap-3
                            sm:grid-cols-2
                          "
                        >
                          <UFormField label="Section">
                            <UInput
                              :model-value="ingredient.groupName ?? undefined"
                              placeholder="e.g. For the sauce"
                              class="w-full"
                              @update:model-value="ingredient.groupName = $event || null"
                            />
                          </UFormField><UFormField label="Note">
                            <UInput
                              :model-value="ingredient.note ?? undefined"
                              placeholder="e.g. finely chopped"
                              class="w-full"
                              @update:model-value="ingredient.note = $event || null"
                            />
                          </UFormField>
                        </div>
                        <UCheckbox
                          v-model="ingredient.isOptional"
                          label="Optional ingredient"
                        />
                        <div
                          v-if="match(ingredient.name)"
                          class="rounded-md bg-muted/40 p-3 text-sm text-muted"
                        >
                          Library nutrition: {{ match(ingredient.name)!.calories ?? 'Unknown' }} kcal per {{ match(ingredient.name)!.calorieAmount ?? '—' }} {{ match(ingredient.name)!.calorieUnit }}. Rename or choose a library name above to change the match.
                        </div>
                        <p
                          v-else-if="firstIngredientIndex(ingredient.name) < index"
                          class="text-sm text-muted"
                        >
                          This uses the new ingredient from row {{ firstIngredientIndex(ingredient.name) + 1 }}.
                          Edit nutrition there; this row keeps its own quantity and notes.
                        </p>
                        <template v-else>
                          <p class="text-xs font-medium text-muted">
                            NEW INGREDIENT · CHECK ESTIMATED NUTRITION
                          </p>
                          <div
                            class="
                              grid gap-3
                              sm:grid-cols-3
                            "
                          >
                            <UFormField label="Calories (kcal)">
                              <UInput
                                v-model.number="ingredient.calories"
                                type="number"
                                min="0"
                                class="w-full"
                              />
                            </UFormField><UFormField label="Per">
                              <UInput
                                :model-value="100"
                                class="w-full"
                                disabled
                              />
                            </UFormField><UFormField label="Nutrition unit">
                              <USelect
                                :model-value="ingredient.nutritionUnit ?? undefined"
                                :items="['g', 'ml']"
                                class="w-full"
                                @update:model-value="ingredient.nutritionUnit = $event as ImportedRecipe['ingredients'][number]['unit']"
                              />
                            </UFormField>
                          </div>
                          <div
                            class="
                              grid gap-3
                              sm:grid-cols-2
                            "
                          >
                            <UFormField label="Category">
                              <UInput
                                :model-value="ingredient.category ?? undefined"
                                class="w-full"
                                @update:model-value="ingredient.category = $event || null"
                              />
                            </UFormField><UFormField label="Default recipe unit">
                              <USelect
                                :model-value="ingredient.defaultUnit ?? undefined"
                                :items="units"
                                class="w-full"
                                @update:model-value="ingredient.defaultUnit = $event as ImportedRecipe['ingredients'][number]['unit']"
                              />
                            </UFormField>
                          </div>
                          <UCheckbox
                            v-model="ingredient.requiresWeight"
                            label="Ask for actual weight when cooking"
                          />
                          <UCheckbox
                            v-model="ingredient.isPantryStaple"
                            label="Generally in the pantry"
                            description="Leave this off a meal-plan shopping list by default."
                          />
                        </template>
                      </div>
                    </div>
                  </div>
                </div>
                <div
                  v-else-if="detailTab === 'steps'"
                  class="flex flex-col gap-5"
                >
                  <div
                    v-for="(step, index) in draft.steps"
                    :key="index"
                    class="
                      grid grid-cols-[2rem_minmax(0,1fr)] gap-3 border-b
                      border-default pb-5
                    "
                  >
                    <span class="mt-2 text-sm text-dimmed">{{ String(index + 1).padStart(2, '0') }}</span>
                    <div class="flex min-w-0 flex-1 flex-col gap-3">
                      <UTextarea
                        v-model="step.instruction"
                        :rows="3"
                        :aria-label="`Step ${index + 1}`"
                        class="w-full"
                      /><div
                        class="flex flex-wrap items-center gap-2"
                      >
                        <USelect
                          v-model="step.type"
                          :items="[{ label: 'Instruction',
                                     value: 'normal' }, { label: 'Timer',
                                                          value: 'timer' }]"
                          aria-label="Step type"
                        /><UInput
                          v-if="step.type === 'timer'"
                          :model-value="step.durationSeconds"
                          type="number"
                          min="1"
                          placeholder="Seconds"
                          aria-label="Timer duration in seconds"
                          @update:model-value="step.durationSeconds = nullableNumber($event)"
                        />
                        <div
                          class="
                            sticky right-0 ml-auto flex shrink-0 items-center
                            gap-1 bg-default
                          "
                        >
                          <UButton
                            :disabled="index === 0"
                            icon="i-lucide-arrow-up"
                            color="neutral"
                            variant="ghost"
                            aria-label="Move step up"
                            @click="moveStep(index, -1)"
                          /><UButton
                            :disabled="index === draft.steps.length - 1"
                            icon="i-lucide-arrow-down"
                            color="neutral"
                            variant="ghost"
                            aria-label="Move step down"
                            @click="moveStep(index, 1)"
                          /><UButton
                            icon="i-lucide-trash-2"
                            color="neutral"
                            variant="ghost"
                            aria-label="Remove step"
                            @click="draft.steps.splice(index, 1)"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <UButton
                    label="Add step"
                    icon="i-lucide-plus"
                    color="neutral"
                    variant="outline"
                    class="self-start"
                    @click="draft.steps.push({ instruction: '',
                                               type: 'normal',
                                               durationSeconds: null })"
                  />
                </div>
                <div
                  v-else
                  class="flex flex-col gap-4"
                >
                  <p class="text-sm text-muted">
                    {{ sourceLabel(selected) }} · Imported {{ dateLabel(selected.createdAt) }}
                  </p>
                  <a
                    v-if="selected.sourceUrl"
                    :href="selected.sourceUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-sm break-all text-primary"
                  >{{ selected.sourceUrl }} ↗</a>
                  <img
                    v-if="sourceImageUrl"
                    :src="sourceImageUrl"
                    alt="Original recipe image"
                    class="
                      max-h-[65vh] self-start rounded-lg border border-default
                      object-contain
                    "
                  >
                  <pre
                    v-if="selected.sourceText"
                    class="text-sm/relaxed whitespace-pre-wrap text-toned"
                  >{{ selected.sourceText }}</pre>
                  <p
                    v-if="!sourceImageUrl && !selected.sourceText"
                    class="text-sm text-muted"
                  >
                    Open the original website to compare the ingredients and instructions.
                  </p>
                </div>
              </fieldset>
            </template>
            <div
              v-else
              class="
                flex min-h-80 flex-col items-center justify-center gap-4 px-6
                py-12 text-center
              "
            >
              <UIcon
                :name="selected.status === 'failed' ? 'i-lucide-circle-alert' : selected.status === 'completed' ? 'i-lucide-circle-check' : 'i-lucide-loader-circle'"
                :class="['queued', 'processing'].includes(selected.status) ? `
                  animate-spin
                ` : ''"
                class="size-8 text-muted"
              />
              <h3 class="font-medium">
                {{ statusLabels[selected.status] || selected.status }}
              </h3>
              <p class="max-w-md text-sm text-muted">
                {{ selected.status === 'failed' ? selected.error : selected.status === 'completed' ? 'This recipe is in your library.' : 'We’re extracting the recipe and matching its ingredients. You can review another import while this runs.' }}
              </p>
              <UButton
                v-if="selected.status === 'failed'"
                :loading="busy"
                label="Retry import"
                @click="retry"
              />
              <UButton
                v-if="selected.status === 'completed' && selected.recipeId"
                :to="`/recipes/${selected.recipeId}/edit`"
                label="Open recipe"
                color="neutral"
                variant="outline"
              />
            </div>
          </template>
          <div
            v-else
            class="
              flex min-h-96 flex-col items-center justify-center gap-3 p-8
              text-center
            "
          >
            <UIcon
              name="i-lucide-inbox"
              class="size-9 text-dimmed"
            /><h2
              class="text-lg font-medium"
            >
              Your next recipes start here
            </h2><p
              class="max-w-sm text-sm text-muted"
            >
              Import a batch of images or URLs, then review each recipe in one place.
            </p><UButton
              label="Import recipes"
              icon="i-lucide-plus"
              class="mt-3"
              @click="importRecipes"
            />
          </div>
        </div>
      </div>
    </div>
  </PageShell>
</template>
