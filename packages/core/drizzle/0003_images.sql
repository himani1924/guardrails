CREATE TABLE IF NOT EXISTS "campaign_asset_files" (
	"asset_id" uuid PRIMARY KEY NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"byte_size" integer NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "image_extractions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_run_id" uuid NOT NULL,
	"asset_id" uuid,
	"image_index" integer NOT NULL,
	"title" varchar(200),
	"mime_type" varchar(100),
	"status" varchar(20) NOT NULL,
	"extracted_text" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"detected_elements" jsonb NOT NULL,
	"possible_concerns" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error" text,
	"model" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaign_assets" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "findings" ADD COLUMN "source_image_index" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaign_asset_files" ADD CONSTRAINT "campaign_asset_files_asset_id_campaign_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."campaign_assets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "image_extractions" ADD CONSTRAINT "image_extractions_analysis_run_id_analysis_runs_id_fk" FOREIGN KEY ("analysis_run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "image_extractions" ADD CONSTRAINT "image_extractions_asset_id_campaign_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."campaign_assets"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "image_extractions_analysis_run_id_idx" ON "image_extractions" USING btree ("analysis_run_id");