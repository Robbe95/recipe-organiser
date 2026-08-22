ALTER TABLE "recipes"."recipe" ADD COLUMN "cook_time_minutes" integer;--> statement-breakpoint
ALTER TABLE "recipes"."recipe" ADD COLUMN "cuisine" text;--> statement-breakpoint
ALTER TABLE "recipes"."recipe" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "recipes"."recipe" ADD COLUMN "prep_time_minutes" integer;--> statement-breakpoint
ALTER TABLE "recipes"."recipe" ADD COLUMN "source_name" text;--> statement-breakpoint
ALTER TABLE "recipes"."recipe" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "recipes"."recipe" ADD COLUMN "tags" text[] DEFAULT '{}' NOT NULL;