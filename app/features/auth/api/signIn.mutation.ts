import { useMutation } from '@pinia/colada'

import { authClient } from '~/lib/authClient'

interface SignInCredentials {
  email: string
  password: string
}

export function useSignInMutation() {
  return useMutation({
    mutation: (credentials: SignInCredentials) =>
      authClient.signIn.email({
        ...credentials,
        callbackURL: '/dashboard',
      }),
  })
}
