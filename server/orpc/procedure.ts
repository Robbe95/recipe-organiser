import {
  ORPCError,
  os,
} from '@orpc/server'

import type { ORPCContext } from './context'

const procedure = os.$context<ORPCContext>()

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
