import type { RiskDimension, RiskLevel } from './enums';

/**
 * One risk dimension of a completed analysis run. The aggregator emits one
 * of these per configured dimension so the UI can render side-by-side gauges
 * instead of a single opaque overall score.
 */
export interface RiskAssessment {
  id: string;
  analysisRunId: string;
  dimension: RiskDimension;
  level: RiskLevel;
  reasons: string[];
  supportingFindingIds: string[];
  confidence: number;
  uncertainty?: string;
  humanReviewRequired: boolean;
  createdAt: string;
}
