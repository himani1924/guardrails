import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import { getLLMProvider } from '../../ai';
import { listAudienceSegments } from '../../audience';
import { getLogger } from '../../logging';
import type { AudiencePerspectiveResult, AudienceSegment } from '../../types/audience';
import type { CampaignContext } from '../../types/campaign';
import type { Finding } from '../../types/finding';

const log = getLogger({ component: 'agents.audience' });

const perspectiveSchema = z.object({
  perspectives: z
    .array(
      z.object({
        audienceSegmentKey: z.string(),
        possibleInterpretation: z.string().max(1000),
        positiveSignals: z.array(z.string().max(300)).max(6).default([]),
        concernSignals: z.array(z.string().max(300)).max(6).default([]),
        ambiguity: z.string().max(500).optional(),
        potentialSensitivity: z.string().max(500).optional(),
        confidence: z.number().min(0).max(1),
      }),
    )
    .max(10),
  agreement: z.string().max(500).optional(),
  disagreement: z.string().max(500).optional(),
  polarizationRisk: z.enum(['low', 'medium', 'high', 'unknown']),
  polarizationExplanation: z.string().max(1000).optional(),
});
type PerspectiveOutput = z.infer<typeof perspectiveSchema>;

const SYSTEM = `You are the Audience Perspective Agent inside Guardrail.

You simulate how a campaign might be interpreted through several configured audience perspectives.

Rules:
1. These are SIMULATED perspectives, not survey results.
2. Do NOT stereotype demographic groups.
3. Frame every interpretation as "Under this configured audience perspective, the following interpretation may occur."
4. Highlight both positive signals and concern signals per perspective.
5. Compare perspectives and set polarizationRisk based on disagreement across perspectives.`;

export interface AudienceAgentInput {
  analysisRunId: string;
  campaign: CampaignContext;
}

export interface AudienceAgentOutput {
  perspectives: AudiencePerspectiveResult[];
  findings: Finding[];
  raw: PerspectiveOutput;
}

export async function runAudienceAgent(
  input: AudienceAgentInput,
): Promise<AudienceAgentOutput> {
  const allSegments = await listAudienceSegments();
  const segments = allSegments.filter((s) =>
    input.campaign.audienceSegmentKeys.includes(s.key),
  );

  const llm = getLLMProvider();
  const { data } = await llm.completeStructured<PerspectiveOutput>({
    schemaName: 'AudiencePerspectives',
    schema: perspectiveSchema,
    system: SYSTEM,
    prompt: buildPrompt(input.campaign, segments),
    temperature: 0.3,
  });

  const segmentByKey = new Map(segments.map((s) => [s.key, s]));

  const perspectives: AudiencePerspectiveResult[] = data.perspectives
    .map((p): AudiencePerspectiveResult | undefined => {
      const seg = segmentByKey.get(p.audienceSegmentKey);
      if (!seg) return undefined;
      return {
        id: randomUUID(),
        analysisRunId: input.analysisRunId,
        audienceSegmentId: seg.id,
        audienceSegmentKey: seg.key,
        possibleInterpretation: p.possibleInterpretation,
        positiveSignals: p.positiveSignals,
        concernSignals: p.concernSignals,
        ambiguity: p.ambiguity,
        potentialSensitivity: p.potentialSensitivity,
        confidence: p.confidence,
        createdAt: new Date().toISOString(),
      };
    })
    .filter((p): p is AudiencePerspectiveResult => p !== undefined);

  const findings: Finding[] = [];
  if (data.polarizationRisk === 'high' || data.polarizationRisk === 'medium') {
    findings.push({
      id: randomUUID(),
      analysisRunId: input.analysisRunId,
      producedBy: 'audience',
      category: 'audience_polarization',
      severity: data.polarizationRisk === 'high' ? 'high' : 'medium',
      title: `Audience perspectives suggest ${data.polarizationRisk} polarization risk`,
      explanation:
        data.polarizationExplanation ??
        'Configured audience perspectives interpret this campaign differently. Review the perspective comparison.',
      confidence: 0.6,
      requiresHumanReview: data.polarizationRisk === 'high',
      evidenceRequired: false,
      evidenceStatus: 'NOT_APPLICABLE',
      evidence: [],
      createdAt: new Date().toISOString(),
    });
  }

  log.debug({ perspectives: perspectives.length, polarization: data.polarizationRisk }, 'audience_done');
  return { perspectives, findings, raw: data };
}

function buildPrompt(ctx: CampaignContext, segments: AudienceSegment[]): string {
  const segmentText = segments
    .map((s) => `- key: ${s.key}\n  name: ${s.name}\n  description: ${s.description}`)
    .join('\n\n');

  return `CAMPAIGN
name: ${ctx.name}
type: ${ctx.campaignType}
geography: ${ctx.geography.country}
festivalContext: ${ctx.festivalContext ? ctx.festivalContext.name : 'none'}

CAMPAIGN COPY
"""
${ctx.copy}
"""

CONFIGURED AUDIENCE PERSPECTIVES
${segmentText}

Return JSON matching schema AudiencePerspectives. Do not stereotype — frame each perspective as "Under this configured audience perspective, the following interpretation may occur."`;
}

export { perspectiveSchema };
