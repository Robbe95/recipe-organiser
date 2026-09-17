import { useMutation } from '@pinia/colada'

import { authClient } from '~/lib/authClient'
import { isKitchenHost } from '~/utils/kitchenHost'

interface SignInCredentials {
  email: string
  password: string
}

export function useSignInMutation() {
  return useMutation({
    mutation: (credentials: SignInCredentials) =>
      authClient.signIn.email({
        ...credentials,
        callbackURL: import.meta.client && isKitchenHost(window.location.hostname)
          ? '/kitchen'
          : '/dashboard',
      }),
  })
}
