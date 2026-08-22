import { authClient } from '~/lib/authClient'

export default defineNuxtRouteMiddleware(async () => {
  const session = authClient.useSession()

  if (session.value.isPending) {
    await new Promise<void>((resolve) => {
      const stop = watch(
        session,
        (value) => {
          if (!value.isPending) {
            stop()
            resolve()
          }
        },
        {
          immediate: true,
        },
      )
    })
  }

  if (session.value.data) {
    return navigateTo('/dashboard')
  }
})
