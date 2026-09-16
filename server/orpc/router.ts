import { imageRouter } from '../features/images/images.router'
import { mealPlannerRouter } from '../features/meal-planner/mealPlanner.router'
import { recipesRouter } from '../features/recipes/recipes.router'

export const router = {
  images: imageRouter,
  mealPlanner: mealPlannerRouter,
  recipes: recipesRouter,
}

export type AppRouter = typeof router
