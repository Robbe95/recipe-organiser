import { createAuthClient } from 'better-auth/vue'

export const authClient = createAuthClient({
  // Better Auth requires an absolute URL. This stays correct on localhost,
  // Vercel preview deployments, and the production custom domain.
  baseURL: import.meta.client
    ? `${window.location.origin}/api/auth`
    : undefined,
})
