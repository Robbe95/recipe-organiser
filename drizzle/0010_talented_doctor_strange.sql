CREATE TABLE "recipes"."recipe_cooking_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_id" text NOT NULL,
	"recipe_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"current_step_index" integer DEFAULT 0 NOT NULL,
	"completed_step_indexes" integer[] DEFAULT '{}' NOT NULL,
	"timers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"note" text
);
--> statement-breakpoint
ALTER TABLE "recipes"."recipe" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "recipes"."recipe" ADD COLUMN "is_favorite" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes"."recipe_import_job" ADD COLUMN "draft" jsonb;--> statement-breakpoint
ALTER TABLE "recipes"."recipe_cooking_session" ADD CONSTRAINT "recipe_cooking_session_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "recipes"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."recipe_cooking_session" ADD CONSTRAINT "recipe_cooking_session_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "recipes"."recipe"("id") ON DELETE cascade ON UPDATE no action;