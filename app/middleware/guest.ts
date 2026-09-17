import { authClient } from '~/lib/authClient'
import { isKitchenHost } from '~/utils/kitchenHost'

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
    const destination = isKitchenHost(useRequestURL().hostname)
      ? '/kitchen'
      : '/dashboard'

    return navigateTo(destination)
  }
})
