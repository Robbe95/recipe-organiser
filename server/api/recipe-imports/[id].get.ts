/* eslint-disable check-file/filename-naming-convention -- Nuxt dynamic route filename */
import { eq } from 'drizzle-orm'
import {
  getRouterParam,
  toWebRequest,
} from 'h3'

import { db } from '../../db'
import {
  recipe,
  recipeImportJob,
} from '../../db/schema'
import { createORPCContext } from '../../orpc/context'

const encoder = new TextEncoder()

function eventPayload(input: {
  recipeId: string | null
  error: string | null
  recipeName: string | null
  status: string
}) {
  return encoder.encode(`event: import\ndata: ${JSON.stringify(input)}\n\n`)
}

export default eventHandler(async (event) => {
  const context = await createORPCContext(toWebRequest(event))
  const id = getRouterParam(event, 'id')

  if (!context.user || !id) {
    throw createError({
      statusCode: 401,
    })
  }

  const initialJob = await db.query.recipeImportJob.findFirst({
    where: eq(recipeImportJob.id, id),
  })

  if (!initialJob || initialJob.createdById !== context.user.id) {
    throw createError({
      statusCode: 404,
    })
  }

  return new Response(new ReadableStream({
    async start(controller) {
      let lastStatus = ''

      for (let attempts = 0; attempts < 180; attempts += 1) {
        const job = await db.query.recipeImportJob.findFirst({
          where: eq(recipeImportJob.id, id),
        })

        if (!job) {
          controller.close()

          return
        }

        if (job.status !== lastStatus || job.status === 'completed' || job.status === 'failed') {
          const savedRecipe = job.recipeId
            ? await db.query.recipe.findFirst({
                where: eq(recipe.id, job.recipeId),
              })
            : null

          controller.enqueue(eventPayload({
            recipeId: job.recipeId,
            error: job.error,
            recipeName: savedRecipe?.name || null,
            status: job.status,
          }))
          lastStatus = job.status
        }

        if (job.status === 'completed' || job.status === 'failed') {
          controller.close()

          return
        }

        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      controller.close()
    },
  }), {
    headers: {
      'cache-control': 'no-cache, no-transform',
      'connection': 'keep-alive',
      'content-type': 'text/event-stream',
    },
  })
})
