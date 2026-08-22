import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { RouterClient } from '@orpc/server'
import { createORPCVueColadaUtils } from '@orpc/vue-colada'

import type { AppRouter } from '../../server/orpc/router'

const link = new RPCLink({
  url: () => new URL('/api/rpc', window.location.origin).toString(),
})

export const client: RouterClient<AppRouter> = createORPCClient(link)
export const orpc = createORPCVueColadaUtils(client)
