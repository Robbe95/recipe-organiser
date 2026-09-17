import { isKitchenHost } from '~/utils/kitchenHost'

/**
 * Keep the Kitchen hostname intentionally separate from the management app.
 * The unauthenticated root remains the sign-in screen; once signed in, the
 * guest middleware sends it to `/kitchen`.
 */
export default defineNuxtRouteMiddleware((to) => {
  if (!isKitchenHost(useRequestURL().hostname)) {
    return
  }

  if (to.path === '/' || to.path.startsWith('/kitchen')) {
    return
  }

  return navigateTo('/kitchen')
})
