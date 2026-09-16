import { ORPCError } from '@orpc/server'
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
} from 'drizzle-orm'
import * as v from 'valibot'

import { db } from '../../db'
import {
  ingredient,
  ingredientType,
  recipe,
  recipeIngredient,
} from '../../db/schema'
import { protectedProcedure } from '../../orpc/procedure'
import { getHouseholdForUser } from '../households/household.service'
import {
  mealPlanItem,
  shoppingListItem,
  shoppingListItemSource,
} from './schema'

const recipeSelection = v.object({
  recipeId: v.pipe(v.string(), v.uuid()),
  portions: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(100)),
})

async function recipeShoppingRequirements(userId: string, selections: Array<{
  recipeId: string
  portions: number
}>) {
  const recipeIds = [
    ...new Set(selections.map((selection) => selection.recipeId)),
  ]
  const savedRecipes = await db.query.recipe.findMany({
    where: and(
      eq(recipe.createdById, userId),
      inArray(recipe.id, recipeIds),
    ),
  })

  if (savedRecipes.length !== recipeIds.length) {
    throw new ORPCError('NOT_FOUND')
  }

  const ingredients = await db.query.recipeIngredient.findMany({
    orderBy: (table) => asc(table.sortOrder),
    where: inArray(recipeIngredient.recipeId, recipeIds),
  })
  const ingredientIds = [
    ...new Set(ingredients.map((item) => item.ingredientId)),
  ]
  const savedIngredients = ingredientIds.length === 0
    ? []
    : await db.query.ingredient.findMany({
        where: inArray(ingredient.id, ingredientIds),
      })
  const typeIds = [
    ...new Set(savedIngredients.flatMap((item) => item.typeId
      ? [
          item.typeId,
        ]
      : [])),
  ]
  const types = typeIds.length === 0
    ? []
    : await db.query.ingredientType.findMany({
        where: inArray(ingredientType.id, typeIds),
      })
  const recipeById = new Map(savedRecipes.map((item) => [
    item.id,
    item,
  ]))
  const ingredientById = new Map(savedIngredients.map((item) => [
    item.id,
    item,
  ]))
  const typeById = new Map(types.map((item) => [
    item.id,
    item,
  ]))

  return selections.flatMap((selection, selectionIndex) => {
    const savedRecipe = recipeById.get(selection.recipeId)!
    const multiplier = selection.portions / savedRecipe.defaultPortions

    return ingredients.filter((item) => item.recipeId === selection.recipeId).map((item) => {
      const savedIngredient = ingredientById.get(item.ingredientId)

      if (!savedIngredient) {
        throw new ORPCError('NOT_FOUND')
      }

      return {
        ingredientId: savedIngredient.id,
        recipeIngredientId: item.id,
        isOptional: Boolean(item.isOptional),
        isPantryStaple: savedIngredient.isPantryStaple,
        name: savedIngredient.name,
        amount: item.amount === null ? null : item.amount * multiplier,
        groupName: typeById.get(savedIngredient.typeId || '')?.name || 'Other',
        recipeName: savedRecipe.name,
        selectionIndex,
        unit: item.unit || savedIngredient.defaultUnit,
      }
    })
  })
}

const previewMealPlanShopping = protectedProcedure.input(v.object({
  selections: v.pipe(v.array(recipeSelection), v.maxLength(30)),
})).handler(({
  context, input,
}) => recipeShoppingRequirements(context.user.id, input.selections))

const addMealPlan = protectedProcedure.input(v.object({
  includedRecipeIngredientIds: v.optional(v.array(v.pipe(v.string(), v.uuid()))),
  selections: v.pipe(v.array(recipeSelection), v.minLength(1), v.maxLength(30)),
})).handler(async ({
  context, input,
}) => {
  const [
    householdId,
    requirements,
  ] = await Promise.all([
    getHouseholdForUser(context.user.id),
    recipeShoppingRequirements(context.user.id, input.selections),
  ])
  const includedIds = input.includedRecipeIngredientIds
    ? new Set(input.includedRecipeIngredientIds)
    : new Set(requirements
        .filter((item) => !item.isOptional && !item.isPantryStaple)
        .map((item) => item.recipeIngredientId))

  return db.transaction(async (tx) => {
    const plannedItems = await tx.insert(mealPlanItem).values(input.selections.map((selection, index) => ({
      createdById: context.user.id,
      householdId,
      recipeId: selection.recipeId,
      portions: selection.portions,
      sortOrder: index,
    }))).returning()

    const includedRequirements = requirements.filter((item) => includedIds.has(item.recipeIngredientId))
    const addedShoppingItems = includedRequirements.length === 0
      ? []
      : await tx.insert(shoppingListItem).values(includedRequirements.map((item, index) => ({
          createdById: context.user.id,
          householdId,
          ingredientId: item.ingredientId,
          name: item.name,
          amount: item.amount,
          groupName: item.groupName,
          sortOrder: index,
          unit: item.unit,
        }))).returning()

    if (addedShoppingItems.length > 0) {
      await tx.insert(shoppingListItemSource).values(addedShoppingItems.map((item, index) => ({
        mealPlanItemId: plannedItems[includedRequirements[index]!.selectionIndex]!.id,
        shoppingListItemId: item.id,
      })))
    }

    return {
      mealPlanItems: plannedItems,
      shoppingListItems: addedShoppingItems,
    }
  })
})

const listMealPlan = protectedProcedure.handler(async ({
  context,
}) => {
  const householdId = await getHouseholdForUser(context.user.id)
  const items = await db.query.mealPlanItem.findMany({
    orderBy: (table) => [
      asc(table.sortOrder),
      desc(table.createdAt),
    ],
    where: eq(mealPlanItem.householdId, householdId),
  })
  const recipeIds = [
    ...new Set(items.map((item) => item.recipeId)),
  ]
  const recipes = recipeIds.length === 0
    ? []
    : await db.query.recipe.findMany({
        where: inArray(recipe.id, recipeIds),
      })
  const recipeById = new Map(recipes.map((item) => [
    item.id,
    item,
  ]))

  return items.flatMap((item) => {
    const savedRecipe = recipeById.get(item.recipeId)

    return savedRecipe
      ? [
          {
            ...item,
            recipe: savedRecipe,
          },
        ]
      : []
  })
})

const removeMealPlanItem = protectedProcedure.input(v.object({
  id: v.pipe(v.string(), v.uuid()),
})).handler(async ({
  context, input,
}) => {
  const householdId = await getHouseholdForUser(context.user.id)
  const [
    deleted,
  ] = await db.delete(mealPlanItem).where(and(
    eq(mealPlanItem.id, input.id),
    eq(mealPlanItem.householdId, householdId),
  )).returning({
    id: mealPlanItem.id,
  })

  if (!deleted) {
    throw new ORPCError('NOT_FOUND')
  }

  return deleted
})

const listShoppingList = protectedProcedure.handler(async ({
  context,
}) => {
  const householdId = await getHouseholdForUser(context.user.id)

  return db.query.shoppingListItem.findMany({
    orderBy: (table) => [
      asc(table.completedAt),
      asc(table.groupName),
      asc(table.sortOrder),
      asc(table.createdAt),
    ],
    where: eq(shoppingListItem.householdId, householdId),
  })
})

const addShoppingListItem = protectedProcedure.input(v.object({
  name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(160)),
  amount: v.optional(v.nullable(v.pipe(v.number(), v.minValue(0), v.maxValue(100_000)))),
  groupName: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(80))),
  note: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(500))),
  unit: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(30))),
})).handler(async ({
  context, input,
}) => {
  const householdId = await getHouseholdForUser(context.user.id)
  const [
    created,
  ] = await db.insert(shoppingListItem).values({
    createdById: context.user.id,
    householdId,
    name: input.name,
    amount: input.amount ?? null,
    groupName: input.groupName || 'Other',
    note: input.note || null,
    unit: input.unit || null,
  }).returning()

  if (!created) {
    throw new ORPCError('INTERNAL_SERVER_ERROR')
  }

  return created
})

const clearCompletedShoppingListItems = protectedProcedure.handler(async ({
  context,
}) => {
  const householdId = await getHouseholdForUser(context.user.id)

  await db.delete(shoppingListItem).where(and(
    eq(shoppingListItem.householdId, householdId),
    isNotNull(shoppingListItem.completedAt),
  ))
})

const setShoppingListItemComplete = protectedProcedure.input(v.object({
  id: v.pipe(v.string(), v.uuid()),
  completed: v.boolean(),
})).handler(async ({
  context, input,
}) => {
  const householdId = await getHouseholdForUser(context.user.id)
  const [
    updated,
  ] = await db.update(shoppingListItem).set({
    completedAt: input.completed ? new Date() : null,
    updatedAt: new Date(),
  }).where(and(
    eq(shoppingListItem.id, input.id),
    eq(shoppingListItem.householdId, householdId),
  )).returning()

  if (!updated) {
    throw new ORPCError('NOT_FOUND')
  }

  return updated
})

const updateShoppingListItem = protectedProcedure.input(v.object({
  id: v.pipe(v.string(), v.uuid()),
  name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(160)),
  amount: v.optional(v.nullable(v.pipe(v.number(), v.minValue(0), v.maxValue(100_000)))),
  note: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(500)))),
  unit: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(30)))),
})).handler(async ({
  context, input,
}) => {
  const householdId = await getHouseholdForUser(context.user.id)
  const [
    updated,
  ] = await db.update(shoppingListItem).set({
    updatedAt: new Date(),
    name: input.name,
    amount: input.amount ?? null,
    note: input.note || null,
    unit: input.unit || null,
  }).where(and(
    eq(shoppingListItem.id, input.id),
    eq(shoppingListItem.householdId, householdId),
  )).returning()

  if (!updated) {
    throw new ORPCError('NOT_FOUND')
  }

  return updated
})

export const mealPlannerRouter = {
  addMealPlan,
  addShoppingListItem,
  clearCompletedShoppingListItems,
  listMealPlan,
  listShoppingList,
  previewMealPlanShopping,
  removeMealPlanItem,
  setShoppingListItemComplete,
  updateShoppingListItem,
}
