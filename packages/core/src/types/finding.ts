import type {
  AgentKind,
  EvidenceStatus,
  FindingCategory,
  Severity,
} from './enums';
import type { Evidence } from './evidence';

/**
 * A single risk signal produced by an agent or the deterministic rule engine.
 *
 * The shape is intentionally the same regardless of which agent produced it,
 * so the UI, orchestrator and aggregator can treat findings uniformly.
 */
export interface Finding {
  id: string;
  analysisRunId: string;
  producedBy: AgentKind;
  category: FindingCategory;
  severity: Severity;
  title: string;
  explanation: string;
  affectedContent?: string;
  confidence: number;
  uncertainty?: string;
  requiresHumanReview: boolean;
  evidenceRequired: boolean;
  evidenceStatus: EvidenceStatus;
  evidence: Evidence[];
  suggestedAction?: string;
  ruleId?: string;
  createdAt: string;
}
