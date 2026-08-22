CREATE TYPE "recipes"."recipe_step_type" AS ENUM('normal', 'timer', 'group');--> statement-breakpoint
CREATE TABLE "recipes"."ingredient" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_id" text NOT NULL,
	"default_unit" text,
	"name" text NOT NULL,
	"type_id" uuid
);
--> statement-breakpoint
CREATE TABLE "recipes"."ingredient_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_id" text NOT NULL,
	"icon" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes"."recipe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_id" text NOT NULL,
	"default_portions" integer DEFAULT 2 NOT NULL,
	"description" text,
	"name" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes"."recipe_ingredient" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"amount" double precision,
	"ingredient_id" uuid NOT NULL,
	"is_optional" integer DEFAULT 0 NOT NULL,
	"note" text,
	"recipe_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"unit" text
);
--> statement-breakpoint
CREATE TABLE "recipes"."recipe_share" (
	"recipe_id" uuid NOT NULL,
	"shared_with_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipe_share_recipe_id_shared_with_id_pk" PRIMARY KEY("recipe_id","shared_with_id")
);
--> statement-breakpoint
CREATE TABLE "recipes"."recipe_step" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"duration_seconds" integer,
	"instruction" text NOT NULL,
	"parent_step_id" uuid,
	"recipe_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"type" "recipes"."recipe_step_type" DEFAULT 'normal' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recipes"."ingredient" ADD CONSTRAINT "ingredient_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "recipes"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."ingredient" ADD CONSTRAINT "ingredient_type_id_ingredient_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "recipes"."ingredient_type"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."ingredient_type" ADD CONSTRAINT "ingredient_type_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "recipes"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."recipe" ADD CONSTRAINT "recipe_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "recipes"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."recipe_ingredient" ADD CONSTRAINT "recipe_ingredient_ingredient_id_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "recipes"."ingredient"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."recipe_ingredient" ADD CONSTRAINT "recipe_ingredient_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "recipes"."recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."recipe_share" ADD CONSTRAINT "recipe_share_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "recipes"."recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."recipe_share" ADD CONSTRAINT "recipe_share_shared_with_id_user_id_fk" FOREIGN KEY ("shared_with_id") REFERENCES "recipes"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."recipe_step" ADD CONSTRAINT "recipe_step_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "recipes"."recipe"("id") ON DELETE cascade ON UPDATE no action;
