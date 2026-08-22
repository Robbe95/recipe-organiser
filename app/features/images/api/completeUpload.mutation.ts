import {
  useMutation,
  useQueryCache,
} from '@pinia/colada'

import { orpc } from '~/lib/orpc'

export function useCompleteImageUploadMutation() {
  const queryCache = useQueryCache()

  return useMutation(
    orpc.images.completeUpload.mutationOptions({
      onSuccess: async () => {
        await queryCache.invalidateQueries({
          key: orpc.images.listImages.key(),
        })
      },
    }),
  )
}
