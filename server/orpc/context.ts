import { auth } from '../utils/auth'

export interface ORPCContext {
  readonly session: { readonly id: string } | null
  readonly user: {
    readonly email: string
    readonly id: string
    readonly name: string
  } | null
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
