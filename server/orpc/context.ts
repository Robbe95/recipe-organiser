import { auth } from '../utils/auth'

export interface ORPCContext {
  readonly session: { readonly id: string } | null
  readonly user: {
    readonly id: string
    readonly name: string
    readonly email: string
  } | null
  readonly waitUntil?: (promise: Promise<unknown>) => void
}

export async function createORPCContext(request: Request): Promise<ORPCContext> {
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  return {
    session: session?.session ?? null,
    user: session?.user ?? null,
  }
}
