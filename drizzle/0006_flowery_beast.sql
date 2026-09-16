CREATE TYPE "recipes"."household_role" AS ENUM('owner', 'member');--> statement-breakpoint
CREATE TABLE "recipes"."household" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes"."household_member" (
	"household_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"role" "recipes"."household_role" DEFAULT 'member' NOT NULL,
	CONSTRAINT "household_member_household_id_user_id_pk" PRIMARY KEY("household_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "recipes"."meal_plan_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"created_by_id" text NOT NULL,
	"recipe_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"portions" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "recipes"."shopping_list_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"created_by_id" text NOT NULL,
	"ingredient_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"name" text NOT NULL,
	"amount" double precision,
	"unit" text,
	"group_name" text,
	"note" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes"."shopping_list_item_source" (
	"shopping_list_item_id" uuid NOT NULL,
	"meal_plan_item_id" uuid NOT NULL,
	CONSTRAINT "shopping_list_item_source_shopping_list_item_id_meal_plan_item_id_pk" PRIMARY KEY("shopping_list_item_id","meal_plan_item_id")
);
--> statement-breakpoint
INSERT INTO "recipes"."household" ("created_by_id", "name")
SELECT "id", "name" || '''s kitchen'
FROM "recipes"."user";
--> statement-breakpoint
INSERT INTO "recipes"."household_member" ("household_id", "user_id", "role")
SELECT "id", "created_by_id", 'owner'
FROM "recipes"."household";
--> statement-breakpoint
ALTER TABLE "recipes"."household" ADD CONSTRAINT "household_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "recipes"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."household_member" ADD CONSTRAINT "household_member_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "recipes"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."household_member" ADD CONSTRAINT "household_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "recipes"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."meal_plan_item" ADD CONSTRAINT "meal_plan_item_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "recipes"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."meal_plan_item" ADD CONSTRAINT "meal_plan_item_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "recipes"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."meal_plan_item" ADD CONSTRAINT "meal_plan_item_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "recipes"."recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."shopping_list_item" ADD CONSTRAINT "shopping_list_item_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "recipes"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."shopping_list_item" ADD CONSTRAINT "shopping_list_item_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "recipes"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."shopping_list_item" ADD CONSTRAINT "shopping_list_item_ingredient_id_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "recipes"."ingredient"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."shopping_list_item_source" ADD CONSTRAINT "shopping_list_item_source_shopping_list_item_id_shopping_list_item_id_fk" FOREIGN KEY ("shopping_list_item_id") REFERENCES "recipes"."shopping_list_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."shopping_list_item_source" ADD CONSTRAINT "shopping_list_item_source_meal_plan_item_id_meal_plan_item_id_fk" FOREIGN KEY ("meal_plan_item_id") REFERENCES "recipes"."meal_plan_item"("id") ON DELETE cascade ON UPDATE no action;
