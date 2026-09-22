import { buildFinding, type Rule } from '../base';

const HEALTH_CLAIM_MARKERS = [
  /clinically proven/i,
  /doctor recommended/i,
  /scientifically proven/i,
  /guaranteed results/i,
  /cures?\b/i,
  /treats?\b/i,
];

const HEALTH_CATEGORIES = ['product_launch', 'promotional', 'brand', 'seasonal'] as const;

export const healthClaimRule: Rule = {
  id: 'health_claim_requires_evidence',
  name: 'Health claim requires evidence',
  description:
    'Health-related marketing claims must be flagged for evidence review by the Compliance Agent.',

  applicableWhen: (ctx) =>
    HEALTH_CATEGORIES.includes(
      ctx.campaignType as (typeof HEALTH_CATEGORIES)[number],
    ),

  evaluate(ctx, runId) {
    const findings = [];
    for (const rx of HEALTH_CLAIM_MARKERS) {
      const m = ctx.copy.match(rx);
      if (!m) continue;
      findings.push(
        buildFinding(this, runId, {
          category: 'unsupported_claim',
          severity: 'high',
          title: 'Health-style claim detected — evidence required',
          explanation: `The copy contains the phrase "${m[0]}", which is a health-style claim. The Compliance Agent must verify against approved evidence, else escalate for human review.`,
          affectedContent: m[0],
          evidenceRequired: true,
          requiresHumanReview: true,
          evidenceStatus: 'REQUIRES_HUMAN_REVIEW',
          suggestedAction:
            'Attach approved supporting evidence, soften the wording, or remove the claim.',
        }),
      );
    }
    return findings;
  },
};
