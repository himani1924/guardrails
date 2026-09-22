import type { RecommendationAction, RecommendationStatus } from './enums';

/**
 * A suggested action a marketing user can take on a finding. Every
 * recommendation must reference the finding that caused it — no free-floating
 * "the campaign could be better" suggestions.
 */
export interface Recommendation {
  id: string;
  analysisRunId: string;
  findingId: string;
  action: RecommendationAction;
  originalContent?: string;
  suggestedModification?: string;
  reason: string;
  confidence: number;
  status: RecommendationStatus;
  createdAt: string;
}
