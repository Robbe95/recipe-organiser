import type { PiniaColadaOptions } from '@pinia/colada'

export default {
  queryOptions: {
    gcTime: 5 * 60_000,
    staleTime: 30_000,
  },
} satisfies PiniaColadaOptions
