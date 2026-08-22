import { useMutation } from '@pinia/colada'

import { orpc } from '~/lib/orpc'

export function useCreateImageUploadMutation() {
  return useMutation(orpc.images.createUpload.mutationOptions())
}
