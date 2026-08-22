import { useQuery } from '@pinia/colada'

import { orpc } from '~/lib/orpc'

export function useImageAssetsQuery() {
  return useQuery(orpc.images.listImages.queryOptions({
    input: {},
  }))
}
