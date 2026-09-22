import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import { getLLMProvider } from '../../ai';
import { retrieve, type RetrievedChunk } from '../../knowledge/retriever';
import { getLogger } from '../../logging';
import type { CampaignContext } from '../../types/campaign';
import type { Evidence } from '../../types/evidence';
import type { Finding } from '../../types/finding';

const log = getLogger({ component: 'agents.cultural' });

const culturalSchema = z.object({
  contextualSignals: z
    .array(
      z.object({
        title: z.string().max(300),
        potentialInterpretation: z.string().max(1000),
        affectedContext: z.string().max(500).optional(),
        severity: z.enum(['info', 'low', 'medium', 'high']),
        confidence: z.number().min(0).max(1),
        uncertainty: z.string().max(500).optional(),
        citedSourceIds: z.array(z.string()).max(10).default([]),
        humanReviewRecommended: z.boolean().default(false),
      }),
    )
    .max(10),
  overallConfidence: z.number().min(0).max(1),
});
type CulturalOutput = z.infer<typeof culturalSchema>;

const SYSTEM = `You are the Cultural Context Agent inside Guardrail.

Rules:
1. Do NOT label a campaign as offensive.
2. Instead report potential interpretations, possible sensitivities, affected context and human-review recommendations.
3. Assume audiences are diverse — an audience segment is not monolithic.
4. Cite ONLY sources appearing in AVAILABLE CULTURAL CONTEXT below, by their sourceId. If none are relevant, cite none.
5. When confidence is under 0.6, set humanReviewRecommended to true.`;

export interface CulturalAgentInput {
  analysisRunId: string;
  campaign: CampaignContext;
}

export interface CulturalAgentOutput {
  findings: Finding[];
  raw: CulturalOutput;
  usedEvidence: RetrievedChunk[];
}

export async function runCulturalAgent(
  input: CulturalAgentInput,
): Promise<CulturalAgentOutput> {
  const chunks = await retrieve({
    query: `${input.campaign.name} ${input.campaign.festivalContext?.name ?? ''} ${input.campaign.copy}`,
    topK: 4,
    filter: {
      sourceType: ['brand_guideline', 'internal_policy'],
    },
  });

  const evidence = chunks.map((c, i) => ({
    sourceId: `src_${i + 1}`,
    documentId: c.documentId,
    documentTitle: c.documentTitle,
    sourceType: c.sourceType,
    excerpt: c.content,
    score: c.score,
  }));

  const llm = getLLMProvider();
  const { data } = await llm.completeStructured<CulturalOutput>({
    schemaName: 'CulturalSignals',
    schema: culturalSchema,
    system: SYSTEM,
    prompt: buildPrompt(input.campaign, evidence),
    temperature: 0.2,
  });

  const findings: Finding[] = data.contextualSignals.map((s) => {
    const cited = s.citedSourceIds
      .map((id) => evidence.find((e) => e.sourceId === id))
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
    const findingId = randomUUID();
    const ev: Evidence[] = cited.map((c) => ({
      id: randomUUID(),
      findingId,
      sourceType: c.sourceType,
      sourceTitle: c.documentTitle,
      sourceDocumentId: c.documentId,
      chunkId: chunks.find((ec) => ec.documentId === c.documentId)?.chunkId,
      excerpt: c.excerpt.slice(0, 500),
      relevanceScore: Math.max(0, Math.min(1, c.score)),
      createdAt: new Date().toISOString(),
    }));
    return {
      id: findingId,
      analysisRunId: input.analysisRunId,
      producedBy: 'cultural',
      category: 'cultural',
      severity: s.severity,
      title: s.title,
      explanation: s.potentialInterpretation,
      affectedContent: s.affectedContext,
      confidence: s.confidence,
      uncertainty: s.uncertainty,
      requiresHumanReview: s.humanReviewRecommended || s.confidence < 0.6,
      evidenceRequired: false,
      evidenceStatus: ev.length > 0 ? 'SUPPORTED' : 'NOT_FOUND',
      evidence: ev,
      suggestedAction: undefined,
      createdAt: new Date().toISOString(),
    };
  });

  log.debug({ count: findings.length }, 'cultural_done');
  return { findings, raw: data, usedEvidence: chunks };
}

function buildPrompt(
  ctx: CampaignContext,
  evidence: Array<{ sourceId: string; documentTitle: string; sourceType: string; excerpt: string }>,
): string {
  const ev =
    evidence.length === 0
      ? '(no cultural-context sources retrieved)'
      : evidence
          .map(
            (e) =>
              `- sourceId: ${e.sourceId}\n  title: ${e.documentTitle}\n  excerpt: """${e.excerpt.slice(0, 500)}"""`,
          )
          .join('\n\n');

  return `CAMPAIGN
name: ${ctx.name}
festivalContext: ${ctx.festivalContext ? ctx.festivalContext.name : 'none'}
geography: ${ctx.geography.country}
audienceSegments: ${ctx.audienceSegmentKeys.join(', ')}

CAMPAIGN COPY
"""
${ctx.copy}
"""

AVAILABLE CULTURAL CONTEXT
${ev}

Return JSON matching CulturalSignals. Frame each signal as a potential interpretation, not a fact.`;
}

export { culturalSchema };
