import { call } from '@orpc/server'
import { PgDialect } from 'drizzle-orm/pg-core'
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { recipesRouter } from '../server/features/recipes/recipes.router'
import { importedRecipeSchema } from '../shared/recipeImport'
import { ingredientLibraryKey } from '../shared/utils/ingredientLibraryKey'

const mocks = vi.hoisted(() => ({
  delete: vi.fn(),
  deleteReturning: vi.fn(),
  deleteWhere: vi.fn(),
  execute: vi.fn(),
  findImage: vi.fn(),
  findIngredient: vi.fn(),
  findJob: vi.fn(),
  ingredientReturning: vi.fn(),
  ingredientWhere: vi.fn(),
  insert: vi.fn(),
  listIngredients: vi.fn(),
  setIngredient: vi.fn(),
  transaction: vi.fn(),
  updateIngredient: vi.fn(),
  values: vi.fn(),
}))

vi.mock('../server/db', () => ({
  db: {
    delete: mocks.delete,
    insert: mocks.insert,
    query: {
      imageAsset: {
        findFirst: mocks.findImage,
      },
      recipeImportJob: {
        findFirst: mocks.findJob,
      },
    },
    transaction: mocks.transaction,
  },
}))

const context = {
  session: {
    id: 'session',
  },
  user: {
    id: 'owner',
    name: 'Test',
    email: 'test@example.com',
  },
}
const imageIds = Array.from({
  length: 10,
}, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`)

describe('recipe imports', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.execute.mockResolvedValue(undefined)
    mocks.findIngredient.mockResolvedValue({
      id: imageIds[0],
      name: 'Spring onion',
      aliases: [],
    })
    mocks.listIngredients.mockResolvedValue([
      {
        id: imageIds[0],
        name: 'Spring onion',
        aliases: [],
      },
    ])
    mocks.ingredientReturning.mockResolvedValue([
      {
        id: imageIds[0],
        name: 'Spring onion',
        aliases: [
          'Green onion',
        ],
      },
    ])
    mocks.ingredientWhere.mockReturnValue({
      returning: mocks.ingredientReturning,
    })
    mocks.setIngredient.mockReturnValue({
      where: mocks.ingredientWhere,
    })
    mocks.updateIngredient.mockReturnValue({
      set: mocks.setIngredient,
    })
    mocks.transaction.mockImplementation((callback) => callback({
      execute: mocks.execute,
      query: {
        ingredient: {
          findFirst: mocks.findIngredient,
          findMany: mocks.listIngredients,
        },
      },
      update: mocks.updateIngredient,
    }))
    mocks.delete.mockReturnValue({
      where: mocks.deleteWhere,
    })
    mocks.deleteWhere.mockReturnValue({
      returning: mocks.deleteReturning,
    })
    mocks.deleteReturning.mockResolvedValue([
      {
        id: imageIds[0],
      },
    ])
    mocks.findImage.mockResolvedValue({
      id: 'owned-image',
    })
    mocks.findJob.mockResolvedValue(null)
    mocks.values.mockImplementation((values: unknown[]) => ({
      returning: () => Promise.resolve(values.map((value, index) => ({
        ...value as object,
        id: imageIds[index],
      }))),
    }))
    mocks.insert.mockReturnValue({
      values: mocks.values,
    })
  })

  describe('saving ingredient aliases', () => {
    it('adds an alias without changing the ingredient name or nutrition', async () => {
      const result = await call(recipesRouter.addIngredientAlias, {
        id: imageIds[0]!,
        alias: 'Green onion',
      }, {
        context,
      })

      expect(result?.name).toBe('Spring onion')
      expect(mocks.setIngredient).toHaveBeenCalledWith({
        aliases: [
          'Green onion',
        ],
      })

      const filter = new PgDialect().sqlToQuery(mocks.findIngredient.mock.calls[0]![0].where)

      expect(filter.params).toEqual([
        imageIds[0],
        'owner',
      ])
    })

    it('rejects an alias belonging to another ingredient', async () => {
      mocks.listIngredients.mockResolvedValue([
        {
          id: imageIds[1],
          name: 'Other onion',
          aliases: [
            'Green onion',
          ],
        },
      ])
      await expect(call(recipesRouter.addIngredientAlias, {
        id: imageIds[0]!,
        alias: 'Green onions',
      }, {
        context,
      }))
        .rejects
        .toMatchObject({
          code: 'CONFLICT',
        })
      expect(mocks.updateIngredient).not.toHaveBeenCalled()
    })

    it('does not modify an ingredient outside the user library', async () => {
      mocks.findIngredient.mockResolvedValue(null)
      await expect(call(recipesRouter.addIngredientAlias, {
        id: imageIds[0]!,
        alias: 'Green onion',
      }, {
        context,
      }))
        .rejects
        .toMatchObject({
          code: 'NOT_FOUND',
        })
      expect(mocks.updateIngredient).not.toHaveBeenCalled()
    })
  })

  describe('removing pending imports', () => {
    it('restricts deletion to the requested user-owned pending job', async () => {
      const result = await call(recipesRouter.removeRecipeImport, {
        id: imageIds[0]!,
      }, {
        context,
      })

      expect(result).toEqual({
        id: imageIds[0],
      })

      const filter = new PgDialect().sqlToQuery(mocks.deleteWhere.mock.calls[0]![0])

      expect(filter.params).toEqual([
        imageIds[0],
        'owner',
        'queued',
        'processing',
        'review',
        'failed',
      ])
      expect(filter.sql).toContain('"created_by_id" =')
      expect(filter.sql).toContain('"status" in')
    })

    it('rejects missing, completed or unowned imports', async () => {
      mocks.deleteReturning.mockResolvedValue([])
      await expect(call(recipesRouter.removeRecipeImport, {
        id: imageIds[0]!,
      }, {
        context,
      }))
        .rejects
        .toMatchObject({
          code: 'NOT_FOUND',
        })
    })

    it('requires authentication before deleting', async () => {
      await expect(call(recipesRouter.removeRecipeImport, {
        id: imageIds[0]!,
      }, {
        context: {
          session: null,
          user: null,
        },
      }))
        .rejects
        .toMatchObject({
          code: 'UNAUTHORIZED',
        })
      expect(mocks.delete).not.toHaveBeenCalled()
    })
  })

  describe('bulk recipe imports', () => {
    it('persists ten images as ten separate recipe jobs in one batch', async () => {
      const jobs = await call(recipesRouter.queueRecipeImports, {
        imageIds,
        urls: [],
      }, {
        context,
      })

      expect(jobs).toHaveLength(10)
      expect(mocks.insert).toHaveBeenCalledTimes(1)
      expect(mocks.values).toHaveBeenCalledWith(imageIds.map((imageId) => ({
        createdById: 'owner',
        imageId,
      })))
      expect(mocks.findImage).toHaveBeenCalledTimes(10)
    })

    it('queues one recipe per unique URL', async () => {
      const urls = [
        'https://example.com/one',
        'https://example.com/two',
        'https://example.com/one',
      ]
      const jobs = await call(recipesRouter.queueRecipeImports, {
        imageIds: [],
        urls,
      }, {
        context,
      })

      expect(jobs).toHaveLength(2)
      expect(mocks.values).toHaveBeenCalledWith([
        {
          createdById: 'owner',
          sourceUrl: urls[0],
        },
        {
          createdById: 'owner',
          sourceUrl: urls[1],
        },
      ])
    })

    it('rejects an entire batch if any image is not owned by the user', async () => {
      mocks.findImage.mockResolvedValueOnce({
        id: imageIds[0],
      }).mockResolvedValueOnce(null)
      await expect(call(recipesRouter.queueRecipeImports, {
        imageIds,
        urls: [],
      }, {
        context,
      })).rejects.toMatchObject({
        code: 'FORBIDDEN',
      })
      expect(mocks.insert).not.toHaveBeenCalled()
    })

    it('rejects empty and oversized batches without creating jobs', async () => {
      for (const input of [
        {
          imageIds: [],
          urls: [],
        },
        {
          imageIds,
          urls: Array.from({
            length: 11,
          }, (_, i) => `https://example.com/${i}`),
        },
      ]) {
        await expect(call(recipesRouter.queueRecipeImports, input, {
          context,
        })).rejects.toMatchObject({
          code: 'BAD_REQUEST',
        })
      }

      expect(mocks.insert).not.toHaveBeenCalled()
    })

    it('requires authentication', async () => {
      await expect(call(recipesRouter.queueRecipeImports, {
        imageIds,
        urls: [],
      }, {
        context: {
          session: null,
          user: null,
        },
      })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      })
      expect(mocks.insert).not.toHaveBeenCalled()
    })
  })

  describe('ingredient review', () => {
    it('uses identical matching for accents, plural names and punctuation', () => {
      for (const [
        left,
        right,
      ] of [
          [
            'Tomatoes',
            'Tomato',
          ],
          [
            'Berries',
            'Berry',
          ],
          [
            'Crème fraîche',
            'Creme fraiche',
          ],
          [
            'Mushrooms',
            'mushroom',
          ],
        ]) {
        expect(ingredientLibraryKey(left!)).toBe(ingredientLibraryKey(right!))
      }

      expect(ingredientLibraryKey('Olive oil')).not.toBe(ingredientLibraryKey('Olives'))
    })

    it('requires ingredients and instructions before a draft can be added', () => {
      expect(importedRecipeSchema.safeParse({
        name: 'Empty recipe',
        defaultPortions: 2,
        ingredients: [],
        steps: [],
      }).success).toBeFalsy()
    })
  })
})
