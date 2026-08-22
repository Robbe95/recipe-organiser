import { imageRouter } from '../features/images/images.router'

export const router = {
  images: imageRouter,
}

export type AppRouter = typeof router
