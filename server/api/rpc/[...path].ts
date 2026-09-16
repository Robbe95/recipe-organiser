/* eslint-disable check-file/filename-naming-convention -- Nuxt catch-all route filename */
import { RPCHandler } from '@orpc/server/fetch'
import { toWebRequest } from 'h3'

import { createORPCContext } from '../../orpc/context'
import { router } from '../../orpc/router'

const handler = new RPCHandler(router)

export default eventHandler(async (event) => {
  const request = toWebRequest(event)
  const {
    response,
  } = await handler.handle(request, {
    context: {
      ...await createORPCContext(request),
      waitUntil: (promise) => event.waitUntil(promise),
    },
    prefix: '/api/rpc',
  })

  return response
})
