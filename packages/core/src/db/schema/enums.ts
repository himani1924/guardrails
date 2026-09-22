import { pgEnum } from 'drizzle-orm/pg-core';

import {
  AGENT_KINDS,
  ANALYSIS_RUN_STATUSES,
  ASSET_TYPES,
  CAMPAIGN_STATUSES,
  CAMPAIGN_TYPES,
  EVIDENCE_STATUSES,
  FINDING_CATEGORIES,
  HUMAN_REVIEW_STATUSES,
  KNOWLEDGE_SOURCE_TYPES,
  PLATFORMS,
  RECOMMENDATION_ACTIONS,
  RECOMMENDATION_STATUSES,
  RISK_DIMENSIONS,
  RISK_LEVELS,
  SEVERITIES,
} from '../../types/enums';

/**
 * Postgres enums, derived from the domain enum tuples so the DB and the
 * TypeScript types can never drift.
 */

export const campaignStatusEnum = pgEnum('campaign_status', CAMPAIGN_STATUSES);
export const campaignTypeEnum = pgEnum('campaign_type', CAMPAIGN_TYPES);
export const platformEnum = pgEnum('platform', PLATFORMS);
export const assetTypeEnum = pgEnum('asset_type', ASSET_TYPES);
export const agentKindEnum = pgEnum('agent_kind', AGENT_KINDS);
export const findingCategoryEnum = pgEnum('finding_category', FINDING_CATEGORIES);
export const severityEnum = pgEnum('severity', SEVERITIES);
export const evidenceStatusEnum = pgEnum('evidence_status', EVIDENCE_STATUSES);
export const riskDimensionEnum = pgEnum('risk_dimension', RISK_DIMENSIONS);
export const riskLevelEnum = pgEnum('risk_level', RISK_LEVELS);
export const recommendationActionEnum = pgEnum('recommendation_action', RECOMMENDATION_ACTIONS);
export const recommendationStatusEnum = pgEnum('recommendation_status', RECOMMENDATION_STATUSES);
export const analysisRunStatusEnum = pgEnum('analysis_run_status', ANALYSIS_RUN_STATUSES);
export const humanReviewStatusEnum = pgEnum('human_review_status', HUMAN_REVIEW_STATUSES);
export const knowledgeSourceTypeEnum = pgEnum('knowledge_source_type', KNOWLEDGE_SOURCE_TYPES);
