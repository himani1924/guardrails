CREATE TYPE "public"."agent_kind" AS ENUM('compliance', 'sentiment', 'cultural', 'audience', 'recommendation', 'rule_engine');--> statement-breakpoint
CREATE TYPE "public"."analysis_run_status" AS ENUM('queued', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('text', 'image', 'video', 'audio', 'url');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'ready_for_analysis', 'analyzing', 'analyzed', 'in_review', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."campaign_type" AS ENUM('promotional', 'brand', 'product_launch', 'seasonal', 'influencer', 'other');--> statement-breakpoint
CREATE TYPE "public"."evidence_status" AS ENUM('SUPPORTED', 'INSUFFICIENT_EVIDENCE', 'CONTRADICTED', 'NOT_FOUND', 'REQUIRES_HUMAN_REVIEW', 'NOT_APPLICABLE');--> statement-breakpoint
CREATE TYPE "public"."finding_category" AS ENUM('regulatory', 'misleading_claim', 'unsupported_claim', 'pricing', 'missing_disclaimer', 'influencer_disclosure', 'privacy', 'brand_policy', 'sentiment', 'cultural', 'audience_polarization', 'other');--> statement-breakpoint
CREATE TYPE "public"."human_review_status" AS ENUM('pending', 'approved', 'rejected', 'changes_requested');--> statement-breakpoint
CREATE TYPE "public"."knowledge_source_type" AS ENUM('internal_policy', 'brand_guideline', 'approved_claim', 'regulatory', 'historical_campaign', 'other');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('instagram', 'facebook', 'tiktok', 'twitter', 'linkedin', 'youtube', 'web', 'email', 'print', 'tv', 'other');--> statement-breakpoint
CREATE TYPE "public"."recommendation_action" AS ENUM('add_evidence', 'modify_claim', 'add_disclaimer', 'clarify_promotion', 'review_imagery', 'review_cultural_context', 'legal_review', 'brand_review', 'other');--> statement-breakpoint
CREATE TYPE "public"."recommendation_status" AS ENUM('proposed', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."risk_dimension" AS ENUM('compliance', 'cultural', 'sentiment', 'brand', 'evidence', 'polarization');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('low', 'medium', 'high', 'critical', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('info', 'low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campaign_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"type" "asset_type" NOT NULL,
	"title" varchar(200),
	"description" text,
	"url" text,
	"storage_path" text,
	"mime_type" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"copy" text NOT NULL,
	"campaign_type" "campaign_type" NOT NULL,
	"platform" "platform" NOT NULL,
	"geography" jsonb NOT NULL,
	"festival_context" jsonb,
	"applicable_policy_context" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audience_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audience_segments_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campaign_audience_segments" (
	"campaign_id" uuid NOT NULL,
	"audience_segment_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_audience_segments_campaign_id_audience_segment_id_pk" PRIMARY KEY("campaign_id","audience_segment_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analysis_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"status" "analysis_run_status" DEFAULT 'queued' NOT NULL,
	"provider" varchar(50),
	"model" varchar(100),
	"requested_by" varchar(100),
	"total_prompt_tokens" integer,
	"total_completion_tokens" integer,
	"total_cost_usd" numeric(12, 6),
	"latency_ms" integer,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"finding_id" uuid NOT NULL,
	"source_type" "knowledge_source_type" NOT NULL,
	"source_title" varchar(300) NOT NULL,
	"source_document_id" varchar(100) NOT NULL,
	"chunk_id" varchar(100),
	"excerpt" text NOT NULL,
	"relevance_score" numeric(4, 3) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_run_id" uuid NOT NULL,
	"produced_by" "agent_kind" NOT NULL,
	"category" "finding_category" NOT NULL,
	"severity" "severity" NOT NULL,
	"title" varchar(300) NOT NULL,
	"explanation" text NOT NULL,
	"affected_content" text,
	"confidence" numeric(4, 3) NOT NULL,
	"uncertainty" text,
	"requires_human_review" boolean DEFAULT false NOT NULL,
	"evidence_required" boolean DEFAULT false NOT NULL,
	"evidence_status" "evidence_status" NOT NULL,
	"suggested_action" text,
	"rule_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "risk_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_run_id" uuid NOT NULL,
	"dimension" "risk_dimension" NOT NULL,
	"level" "risk_level" NOT NULL,
	"reasons" jsonb NOT NULL,
	"supporting_finding_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence" numeric(4, 3) NOT NULL,
	"uncertainty" text,
	"human_review_required" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_run_id" uuid NOT NULL,
	"finding_id" uuid NOT NULL,
	"action" "recommendation_action" NOT NULL,
	"original_content" text,
	"suggested_modification" text,
	"reason" text NOT NULL,
	"confidence" numeric(4, 3) NOT NULL,
	"status" "recommendation_status" DEFAULT 'proposed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "human_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"analysis_run_id" uuid,
	"reviewer_id" varchar(100) NOT NULL,
	"reviewer_name" varchar(200),
	"status" "human_review_status" DEFAULT 'pending' NOT NULL,
	"decision" text,
	"comments" text,
	"overrides" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_kind" varchar(20) NOT NULL,
	"actor_id" varchar(200) NOT NULL,
	"actor_name" varchar(200),
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" varchar(100) NOT NULL,
	"summary" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaign_assets" ADD CONSTRAINT "campaign_assets_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaign_audience_segments" ADD CONSTRAINT "campaign_audience_segments_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaign_audience_segments" ADD CONSTRAINT "campaign_audience_segments_audience_segment_id_audience_segments_id_fk" FOREIGN KEY ("audience_segment_id") REFERENCES "public"."audience_segments"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "evidence" ADD CONSTRAINT "evidence_finding_id_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."findings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "findings" ADD CONSTRAINT "findings_analysis_run_id_analysis_runs_id_fk" FOREIGN KEY ("analysis_run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_analysis_run_id_analysis_runs_id_fk" FOREIGN KEY ("analysis_run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_analysis_run_id_analysis_runs_id_fk" FOREIGN KEY ("analysis_run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_finding_id_findings_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."findings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "human_reviews" ADD CONSTRAINT "human_reviews_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "human_reviews" ADD CONSTRAINT "human_reviews_analysis_run_id_analysis_runs_id_fk" FOREIGN KEY ("analysis_run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "campaign_assets_campaign_id_idx" ON "campaign_assets" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "campaigns_status_idx" ON "campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "campaigns_created_at_idx" ON "campaigns" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "campaign_audience_segments_segment_idx" ON "campaign_audience_segments" USING btree ("audience_segment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analysis_runs_campaign_id_idx" ON "analysis_runs" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analysis_runs_status_idx" ON "analysis_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analysis_runs_started_at_idx" ON "analysis_runs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "evidence_finding_id_idx" ON "evidence" USING btree ("finding_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "findings_analysis_run_id_idx" ON "findings" USING btree ("analysis_run_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "findings_category_idx" ON "findings" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "findings_severity_idx" ON "findings" USING btree ("severity");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "findings_produced_by_idx" ON "findings" USING btree ("produced_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "risk_assessments_analysis_run_id_idx" ON "risk_assessments" USING btree ("analysis_run_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "risk_assessments_run_dim_uniq" ON "risk_assessments" USING btree ("analysis_run_id","dimension");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recommendations_analysis_run_id_idx" ON "recommendations" USING btree ("analysis_run_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recommendations_finding_id_idx" ON "recommendations" USING btree ("finding_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "human_reviews_campaign_id_idx" ON "human_reviews" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "human_reviews_status_idx" ON "human_reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "human_reviews_reviewer_id_idx" ON "human_reviews" USING btree ("reviewer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");