CREATE TABLE "recipes"."recipe_import_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"image_id" uuid,
	"source_text" text,
	"source_url" text,
	"recipe_id" uuid,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "recipes"."recipe_import_job" ADD CONSTRAINT "recipe_import_job_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "recipes"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."recipe_import_job" ADD CONSTRAINT "recipe_import_job_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "recipes"."recipe"("id") ON DELETE set null ON UPDATE no action;