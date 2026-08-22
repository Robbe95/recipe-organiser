/* eslint-disable check-file/filename-naming-convention -- Nuxt catch-all route filename */
import { auth } from '../../utils/auth'

export default defineEventHandler((event) => auth.handler(toWebRequest(event)))
