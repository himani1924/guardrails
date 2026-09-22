import { randomUUID } from 'node:crypto';

import type { CampaignContext } from '../types/campaign';
import type { Finding } from '../types/finding';

/**
 * Rule contract. Rules are pure deterministic checks — no LLM calls, no
 * network. Any subjective reasoning is delegated to the Compliance Agent.
 */
export interface Rule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  applicableWhen(ctx: CampaignContext): boolean;
  evaluate(ctx: CampaignContext, analysisRunId: string): Finding[];
}

/**
 * Helper for rules to emit a well-formed finding without repeating boilerplate.
 */
export function buildFinding(
  rule: Pick<Rule, 'id' | 'name'>,
  analysisRunId: string,
  fields: Omit<
    Finding,
    | 'id'
    | 'analysisRunId'
    | 'producedBy'
    | 'confidence'
    | 'requiresHumanReview'
    | 'evidenceStatus'
    | 'evidence'
    | 'ruleId'
    | 'createdAt'
  > &
    Partial<
      Pick<
        Finding,
        | 'confidence'
        | 'requiresHumanReview'
        | 'evidenceStatus'
        | 'evidence'
      >
    >,
): Finding {
  return {
    id: randomUUID(),
    analysisRunId,
    producedBy: 'rule_engine',
    ruleId: rule.id,
    category: fields.category,
    severity: fields.severity,
    title: fields.title,
    explanation: fields.explanation,
    affectedContent: fields.affectedContent,
    confidence: fields.confidence ?? 1,
    uncertainty: fields.uncertainty,
    requiresHumanReview: fields.requiresHumanReview ?? false,
    evidenceRequired: fields.evidenceRequired,
    evidenceStatus: fields.evidenceStatus ?? 'NOT_APPLICABLE',
    evidence: fields.evidence ?? [],
    suggestedAction: fields.suggestedAction,
    createdAt: new Date().toISOString(),
  };
}
