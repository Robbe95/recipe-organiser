CREATE SCHEMA "recipes";
--> statement-breakpoint
CREATE TYPE "recipes"."recipe_label_kind" AS ENUM('cuisine', 'source', 'tag');--> statement-breakpoint
CREATE TYPE "recipes"."recipe_step_type" AS ENUM('normal', 'timer', 'group');--> statement-breakpoint
CREATE TABLE "recipes"."user_ai_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"openai_api_key_encrypted" text
);
--> statement-breakpoint
CREATE TABLE "recipes"."account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"refresh_token_expires_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	"issuer" text NOT NULL,
	"access_token" text,
	"id_token" text,
	"password" text,
	"refresh_token" text,
	"scope" text
);
--> statement-breakpoint
CREATE TABLE "recipes"."session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"token" text NOT NULL,
	"user_agent" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "recipes"."user" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "recipes"."verification" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone,
	"identifier" text NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes"."ingredient" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_id" text NOT NULL,
	"type_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"calorie_amount" double precision,
	"calories" integer,
	"calories_per_100g" integer,
	"calorie_unit" text,
	"default_unit" text,
	"grams_per_unit" double precision
);
--> statement-breakpoint
CREATE TABLE "recipes"."ingredient_type" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"icon" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes"."recipe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_id" text NOT NULL,
	"image_id" uuid,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"name" text NOT NULL,
	"calories" integer,
	"calories_override" integer,
	"cook_time_minutes" integer,
	"cuisine" text,
	"default_portions" integer DEFAULT 2 NOT NULL,
	"description" text,
	"notes" text,
	"prep_time_minutes" integer,
	"source_name" text,
	"source_url" text,
	"tags" text[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes"."recipe_cooking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_id" text NOT NULL,
	"recipe_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "recipes"."recipe_cooking_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_id" text NOT NULL,
	"recipe_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_step_indexes" integer[] DEFAULT '{}' NOT NULL,
	"current_step_index" integer DEFAULT 0 NOT NULL,
	"note" text,
	"timers" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes"."recipe_import_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_id" text NOT NULL,
	"image_id" uuid,
	"recipe_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"draft" jsonb,
	"error" text,
	"source_text" text,
	"source_url" text,
	"status" text DEFAULT 'queued' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes"."recipe_ingredient" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"is_optional" integer DEFAULT 0 NOT NULL,
	"amount" double precision,
	"note" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"unit" text
);
--> statement-breakpoint
CREATE TABLE "recipes"."recipe_label" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"kind" "recipes"."recipe_label_kind" NOT NULL
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
	"parent_step_id" uuid,
	"recipe_id" uuid NOT NULL,
	"duration_seconds" integer,
	"instruction" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"type" "recipes"."recipe_step_type" DEFAULT 'normal' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes"."image_asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"crop" jsonb NOT NULL,
	"focal_x" real DEFAULT 0.5 NOT NULL,
	"focal_y" real DEFAULT 0.5 NOT NULL,
	"height" integer NOT NULL,
	"source_key" text NOT NULL,
	"variant_keys" jsonb NOT NULL,
	"width" integer NOT NULL,
	CONSTRAINT "image_asset_source_key_unique" UNIQUE("source_key")
);
--> statement-breakpoint
ALTER TABLE "recipes"."user_ai_settings" ADD CONSTRAINT "user_ai_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "recipes"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "recipes"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "recipes"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."ingredient" ADD CONSTRAINT "ingredient_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "recipes"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."ingredient" ADD CONSTRAINT "ingredient_type_id_ingredient_type_id_fk" FOREIGN KEY ("type_id") REFERENCES "recipes"."ingredient_type"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."ingredient_type" ADD CONSTRAINT "ingredient_type_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "recipes"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."recipe" ADD CONSTRAINT "recipe_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "recipes"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."recipe_cooking" ADD CONSTRAINT "recipe_cooking_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "recipes"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."recipe_cooking" ADD CONSTRAINT "recipe_cooking_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "recipes"."recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."recipe_cooking_session" ADD CONSTRAINT "recipe_cooking_session_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "recipes"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."recipe_cooking_session" ADD CONSTRAINT "recipe_cooking_session_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "recipes"."recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."recipe_import_job" ADD CONSTRAINT "recipe_import_job_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "recipes"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."recipe_import_job" ADD CONSTRAINT "recipe_import_job_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "recipes"."recipe"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."recipe_ingredient" ADD CONSTRAINT "recipe_ingredient_ingredient_id_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "recipes"."ingredient"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."recipe_ingredient" ADD CONSTRAINT "recipe_ingredient_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "recipes"."recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."recipe_label" ADD CONSTRAINT "recipe_label_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "recipes"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."recipe_share" ADD CONSTRAINT "recipe_share_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "recipes"."recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."recipe_share" ADD CONSTRAINT "recipe_share_shared_with_id_user_id_fk" FOREIGN KEY ("shared_with_id") REFERENCES "recipes"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."recipe_step" ADD CONSTRAINT "recipe_step_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "recipes"."recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes"."image_asset" ADD CONSTRAINT "image_asset_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "recipes"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "account_issuer_account_id_unique" ON "recipes"."account" USING btree ("issuer","account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_label_created_by_kind_name_unique" ON "recipes"."recipe_label" USING btree ("created_by_id","kind","name");