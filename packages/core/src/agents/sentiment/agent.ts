import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import { getLLMProvider } from '../../ai';
import { getLogger } from '../../logging';
import type { CampaignContext } from '../../types/campaign';
import type { Finding } from '../../types/finding';

const log = getLogger({ component: 'agents.sentiment' });

const sentimentSchema = z.object({
  overallSentiment: z.enum(['positive', 'neutral', 'mixed', 'negative']),
  tone: z.string().max(200),
  emotions: z.array(z.string().max(60)).max(10),
  riskSignals: z
    .array(
      z.object({
        title: z.string().max(300),
        explanation: z.string().max(1000),
        severity: z.enum(['info', 'low', 'medium', 'high']),
        affectedContent: z.string().max(1000).optional(),
        confidence: z.number().min(0).max(1),
        uncertainty: z.string().max(500).optional(),
      }),
    )
    .max(10),
  overallConfidence: z.number().min(0).max(1),
  overallUncertainty: z.string().max(1000).optional(),
});
type SentimentOutput = z.infer<typeof sentimentSchema>;

const SYSTEM = `You are the Sentiment Agent inside Guardrail.

Do not claim that the campaign WILL cause a specific public reaction. Instead identify potential reaction signals a marketing manager should be aware of.

Rules:
1. Output a single JSON object.
2. Frame every risk signal as "potential" / "may be perceived as" — never as fact.
3. Set confidence honestly. Under 0.6 must be reflected in overallUncertainty.
4. Be conservative: return an empty riskSignals array when the copy is unambiguously neutral.`;

export interface SentimentAgentInput {
  analysisRunId: string;
  campaign: CampaignContext;
}

export interface SentimentAgentOutput {
  findings: Finding[];
  raw: SentimentOutput;
}

export async function runSentimentAgent(
  input: SentimentAgentInput,
): Promise<SentimentAgentOutput> {
  const llm = getLLMProvider();
  const prompt = buildPrompt(input.campaign);
  const { data } = await llm.completeStructured<SentimentOutput>({
    schemaName: 'SentimentAnalysis',
    schema: sentimentSchema,
    system: SYSTEM,
    prompt,
    temperature: 0.2,
  });

  const findings: Finding[] = data.riskSignals.map((s) => ({
    id: randomUUID(),
    analysisRunId: input.analysisRunId,
    producedBy: 'sentiment',
    category: 'sentiment',
    severity: s.severity,
    title: s.title,
    explanation: s.explanation,
    affectedContent: s.affectedContent,
    confidence: s.confidence,
    uncertainty: s.uncertainty,
    requiresHumanReview: s.confidence < 0.6 || s.severity === 'high',
    evidenceRequired: false,
    evidenceStatus: 'NOT_APPLICABLE',
    evidence: [],
    suggestedAction: undefined,
    createdAt: new Date().toISOString(),
  }));

  log.debug({ count: findings.length, sentiment: data.overallSentiment }, 'sentiment_done');
  return { findings, raw: data };
}

function buildPrompt(ctx: CampaignContext): string {
  return `CAMPAIGN
name: ${ctx.name}
type: ${ctx.campaignType}
platform: ${ctx.platform}
geography: ${ctx.geography.country}
audienceSegments: ${ctx.audienceSegmentKeys.join(', ')}

CAMPAIGN COPY
"""
${ctx.copy}
"""

Return JSON matching schema SentimentAnalysis. Frame risk signals as potential reactions, not certainties.`;
}

export { sentimentSchema };
