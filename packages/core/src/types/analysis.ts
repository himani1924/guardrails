import type { AnalysisRunStatus } from './enums';
import type { AudiencePerspectiveResult } from './audience';
import type { Finding } from './finding';
import type { Recommendation } from './recommendation';
import type { RiskAssessment } from './risk';

/**
 * A completed analysis run, materialised into a single read-model that the
 * dashboard can render without extra joins.
 */
export interface AnalysisResult {
  runId: string;
  campaignId: string;
  status: AnalysisRunStatus;
  startedAt: string;
  completedAt?: string;
  provider?: string;
  model?: string;
  findings: Finding[];
  risks: RiskAssessment[];
  recommendations: Recommendation[];
  audiencePerspectives: AudiencePerspectiveResult[];
  totalPromptTokens?: number;
  totalCompletionTokens?: number;
  totalCostUsd?: number;
  latencyMs?: number;
  error?: string;
}
