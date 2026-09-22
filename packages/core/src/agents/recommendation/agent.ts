import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import { getLLMProvider } from '../../ai';
import { getLogger } from '../../logging';
import { RECOMMENDATION_ACTIONS } from '../../types/enums';
import type { CampaignContext } from '../../types/campaign';
import type { Finding } from '../../types/finding';
import type { Recommendation } from '../../types/recommendation';

const log = getLogger({ component: 'agents.recommendation' });

const recommendationSchema = z.object({
  recommendations: z
    .array(
      z.object({
        findingId: z.string(),
        action: z.enum(RECOMMENDATION_ACTIONS),
        reason: z.string().min(3).max(1000),
        originalContent: z.string().max(2000).optional(),
        suggestedModification: z.string().max(2000).optional(),
        confidence: z.number().min(0).max(1),
      }),
    )
    .max(30),
});
type RecommendationOutput = z.infer<typeof recommendationSchema>;

const SYSTEM = `You are the Recommendation Agent inside Guardrail.

Rules:
1. Every recommendation MUST reference an existing finding by its findingId.
2. Do NOT silently rewrite the campaign. Provide the original content and the proposed modification separately.
3. Suggest specific actions. Prefer minimal edits.
4. For findings with evidenceStatus in {NOT_FOUND, INSUFFICIENT_EVIDENCE, REQUIRES_HUMAN_REVIEW}, prefer action=add_evidence or legal_review over modify_claim unless the claim itself is misleading.`;

export interface RecommendationAgentInput {
  analysisRunId: string;
  campaign: CampaignContext;
  findings: Finding[];
}

export interface RecommendationAgentOutput {
  recommendations: Recommendation[];
}

export async function runRecommendationAgent(
  input: RecommendationAgentInput,
): Promise<RecommendationAgentOutput> {
  if (input.findings.length === 0) return { recommendations: [] };

  const llm = getLLMProvider();
  const { data } = await llm.completeStructured<RecommendationOutput>({
    schemaName: 'Recommendations',
    schema: recommendationSchema,
    system: SYSTEM,
    prompt: buildPrompt(input.campaign, input.findings),
    temperature: 0.2,
  });

  const findingIds = new Set(input.findings.map((f) => f.id));
  const recs: Recommendation[] = data.recommendations
    .filter((r) => findingIds.has(r.findingId))
    .map((r) => ({
      id: randomUUID(),
      analysisRunId: input.analysisRunId,
      findingId: r.findingId,
      action: r.action,
      originalContent: r.originalContent,
      suggestedModification: r.suggestedModification,
      reason: r.reason,
      confidence: r.confidence,
      status: 'proposed',
      createdAt: new Date().toISOString(),
    }));

  log.debug({ count: recs.length }, 'recommendation_done');
  return { recommendations: recs };
}

function buildPrompt(ctx: CampaignContext, findings: Finding[]): string {
  const findingText = findings
    .map(
      (f) =>
        `- findingId: ${f.id}\n  category: ${f.category}\n  severity: ${f.severity}\n  title: ${f.title}\n  explanation: ${f.explanation}\n  affectedContent: ${f.affectedContent ?? '(none)'}\n  evidenceStatus: ${f.evidenceStatus}`,
    )
    .join('\n\n');
  return `CAMPAIGN COPY
"""
${ctx.copy}
"""

FINDINGS
${findingText}

Return JSON matching schema Recommendations. Every recommendation MUST reference an existing findingId above.`;
}

export { recommendationSchema };
