/**
 * Enumerations shared across the domain. Kept as string-literal unions rather
 * than TypeScript `enum` so they round-trip cleanly through JSON, Zod and
 * Postgres text/enum columns.
 */

export const CAMPAIGN_TYPES = [
  'promotional',
  'brand',
  'product_launch',
  'seasonal',
  'influencer',
  'other',
] as const;
export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

export const PLATFORMS = [
  'instagram',
  'facebook',
  'tiktok',
  'twitter',
  'linkedin',
  'youtube',
  'web',
  'email',
  'print',
  'tv',
  'other',
] as const;
export type Platform = (typeof PLATFORMS)[number];

export const CAMPAIGN_STATUSES = [
  'draft',
  'ready_for_analysis',
  'analyzing',
  'analyzed',
  'in_review',
  'approved',
  'rejected',
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const ASSET_TYPES = ['text', 'image', 'video', 'audio', 'url'] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const AGENT_KINDS = [
  'compliance',
  'sentiment',
  'cultural',
  'audience',
  'recommendation',
  'rule_engine',
] as const;
export type AgentKind = (typeof AGENT_KINDS)[number];

export const FINDING_CATEGORIES = [
  'regulatory',
  'misleading_claim',
  'unsupported_claim',
  'pricing',
  'missing_disclaimer',
  'influencer_disclosure',
  'privacy',
  'brand_policy',
  'sentiment',
  'cultural',
  'audience_polarization',
  'other',
] as const;
export type FindingCategory = (typeof FINDING_CATEGORIES)[number];

export const SEVERITIES = ['info', 'low', 'medium', 'high', 'critical'] as const;
export type Severity = (typeof SEVERITIES)[number];

/**
 * Contract between the retrieval layer, the LLM and the UI. A finding must
 * always declare which of these it is in, so the UI never confuses "we
 * couldn't find evidence" with "there is no violation".
 */
export const EVIDENCE_STATUSES = [
  'SUPPORTED',
  'INSUFFICIENT_EVIDENCE',
  'CONTRADICTED',
  'NOT_FOUND',
  'REQUIRES_HUMAN_REVIEW',
  'NOT_APPLICABLE',
] as const;
export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

export const RISK_DIMENSIONS = [
  'compliance',
  'cultural',
  'sentiment',
  'brand',
  'evidence',
  'polarization',
] as const;
export type RiskDimension = (typeof RISK_DIMENSIONS)[number];

export const RISK_LEVELS = ['low', 'medium', 'high', 'critical', 'unknown'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const RECOMMENDATION_ACTIONS = [
  'add_evidence',
  'modify_claim',
  'add_disclaimer',
  'clarify_promotion',
  'review_imagery',
  'review_cultural_context',
  'legal_review',
  'brand_review',
  'other',
] as const;
export type RecommendationAction = (typeof RECOMMENDATION_ACTIONS)[number];

export const RECOMMENDATION_STATUSES = ['proposed', 'accepted', 'rejected'] as const;
export type RecommendationStatus = (typeof RECOMMENDATION_STATUSES)[number];

export const ANALYSIS_RUN_STATUSES = [
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled',
] as const;
export type AnalysisRunStatus = (typeof ANALYSIS_RUN_STATUSES)[number];

export const HUMAN_REVIEW_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'changes_requested',
] as const;
export type HumanReviewStatus = (typeof HUMAN_REVIEW_STATUSES)[number];

export const KNOWLEDGE_SOURCE_TYPES = [
  'internal_policy',
  'brand_guideline',
  'approved_claim',
  'regulatory',
  'historical_campaign',
  'other',
] as const;
export type KnowledgeSourceType = (typeof KNOWLEDGE_SOURCE_TYPES)[number];
