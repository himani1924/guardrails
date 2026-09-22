CREATE TABLE IF NOT EXISTS "knowledge_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"content" text NOT NULL,
	"token_count" integer,
	"embedding" double precision[],
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "knowledge_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(300) NOT NULL,
	"source_type" "knowledge_source_type" NOT NULL,
	"category" varchar(100),
	"geography" varchar(10),
	"effective_date" varchar(20),
	"version" varchar(40),
	"document_type" varchar(100),
	"content" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feedback_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"analysis_run_id" uuid,
	"finding_id" uuid,
	"recommendation_id" uuid,
	"human_review_id" uuid,
	"action" varchar(60) NOT NULL,
	"reviewer_id" varchar(100) NOT NULL,
	"reviewer_name" varchar(200),
	"payload" jsonb,
	"comments" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audience_perspective_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_run_id" uuid NOT NULL,
	"audience_segment_id" uuid NOT NULL,
	"audience_segment_key" varchar(100) NOT NULL,
	"possible_interpretation" text NOT NULL,
	"positive_signals" jsonb NOT NULL,
	"concern_signals" jsonb NOT NULL,
	"ambiguity" text,
	"potential_sensitivity" text,
	"confidence" numeric(4, 3) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_document_id_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feedback_events" ADD CONSTRAINT "feedback_events_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feedback_events" ADD CONSTRAINT "feedback_events_analysis_run_id_analysis_runs_id_fk" FOREIGN KEY ("analysis_run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feedback_events" ADD CONSTRAINT "feedback_events_finding_id_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."findings"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feedback_events" ADD CONSTRAINT "feedback_events_recommendation_id_recommendations_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "public"."recommendations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feedback_events" ADD CONSTRAINT "feedback_events_human_review_id_human_reviews_id_fk" FOREIGN KEY ("human_review_id") REFERENCES "public"."human_reviews"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audience_perspective_results" ADD CONSTRAINT "audience_perspective_results_analysis_run_id_analysis_runs_id_fk" FOREIGN KEY ("analysis_run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audience_perspective_results" ADD CONSTRAINT "audience_perspective_results_audience_segment_id_audience_segments_id_fk" FOREIGN KEY ("audience_segment_id") REFERENCES "public"."audience_segments"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_chunks_document_id_idx" ON "knowledge_chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_documents_source_type_idx" ON "knowledge_documents" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_documents_geography_idx" ON "knowledge_documents" USING btree ("geography");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedback_events_campaign_id_idx" ON "feedback_events" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedback_events_action_idx" ON "feedback_events" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedback_events_finding_id_idx" ON "feedback_events" USING btree ("finding_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audience_perspective_results_analysis_run_id_idx" ON "audience_perspective_results" USING btree ("analysis_run_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audience_perspective_results_segment_id_idx" ON "audience_perspective_results" USING btree ("audience_segment_id");