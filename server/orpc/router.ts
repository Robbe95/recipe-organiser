import { imageRouter } from '../features/images/images.router'
import { recipesRouter } from '../features/recipes/recipes.router'

export const router = {
  images: imageRouter,
  recipes: recipesRouter,
}

export type AppRouter = typeof router
