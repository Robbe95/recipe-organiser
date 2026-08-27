ALTER TABLE "recipes"."recipe_cooking" ADD COLUMN "calories" integer;--> statement-breakpoint
ALTER TABLE "recipes"."recipe_cooking" ADD COLUMN "ingredient_usage" jsonb DEFAULT '[]'::jsonb NOT NULL;