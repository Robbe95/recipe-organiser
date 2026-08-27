CREATE TABLE "recipes"."ingredient_variant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"name" text DEFAULT 'Generic' NOT NULL,
	"calories" integer,
	"calorie_amount" double precision,
	"calorie_unit" text,
	"is_default" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recipes"."ingredient" ADD COLUMN "requires_weight" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes"."ingredient_variant" ADD CONSTRAINT "ingredient_variant_ingredient_id_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "recipes"."ingredient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_variant_ingredient_name_unique" ON "recipes"."ingredient_variant" USING btree ("ingredient_id","name");
--> statement-breakpoint
INSERT INTO "recipes"."ingredient_variant" ("ingredient_id", "name", "calories", "calorie_amount", "calorie_unit", "is_default")
SELECT "id", 'Generic', COALESCE("calories", "calories_per_100g"), COALESCE("calorie_amount", CASE WHEN "calories_per_100g" IS NOT NULL THEN 100 END), COALESCE("calorie_unit", CASE WHEN "calories_per_100g" IS NOT NULL THEN 'g' END), 1
FROM "recipes"."ingredient";
