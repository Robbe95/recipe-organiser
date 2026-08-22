ALTER TABLE "recipes"."ingredient" ADD COLUMN "calories_per_100g" integer;--> statement-breakpoint
ALTER TABLE "recipes"."ingredient" ADD COLUMN "grams_per_unit" double precision;--> statement-breakpoint
ALTER TABLE "recipes"."recipe" ADD COLUMN "calories" integer;--> statement-breakpoint
ALTER TABLE "recipes"."recipe" ADD COLUMN "calories_override" integer;