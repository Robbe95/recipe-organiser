import {
  ORPCError,
  os,
} from '@orpc/server'

import type { ORPCContext } from './context'

const procedure = os.$context<ORPCContext>().use(async ({
  next,
}) => {
  try {
    return await next()
  }
  catch (error) {
    console.error('Unhandled RPC error.', error)

    if (error instanceof ORPCError || process.env.NODE_ENV === 'production') {
      throw error
    }

    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      cause: error,
      message: error instanceof Error ? error.message : String(error),
    })
  }
})

export const protectedProcedure = procedure.use(({
  context, next,
}) => {
  if (!context.user || !context.session) {
    throw new ORPCError('UNAUTHORIZED')
  }

  return next({
    context: {
      ...context,
      session: context.session,
      user: context.user,
    },
  })
})
