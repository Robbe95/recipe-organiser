import { useMutation } from '@pinia/colada'

import { authClient } from '~/lib/authClient'

export function useSignOutMutation() {
  return useMutation({
    mutation: () => authClient.signOut(),
  })
}
