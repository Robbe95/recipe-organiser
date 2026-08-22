CREATE TYPE "recipes"."recipe_label_kind" AS ENUM('cuisine', 'source', 'tag');--> statement-breakpoint
CREATE TABLE "recipes"."recipe_label" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"kind" "recipes"."recipe_label_kind" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recipes"."recipe_label" ADD CONSTRAINT "recipe_label_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "recipes"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_label_created_by_kind_name_unique" ON "recipes"."recipe_label" USING btree ("created_by_id","kind","name");