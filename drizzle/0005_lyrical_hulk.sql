ALTER TABLE "recipes"."ingredient" ADD COLUMN "calorie_amount" double precision;--> statement-breakpoint
ALTER TABLE "recipes"."ingredient" ADD COLUMN "calories" integer;--> statement-breakpoint
ALTER TABLE "recipes"."ingredient" ADD COLUMN "calorie_unit" text;