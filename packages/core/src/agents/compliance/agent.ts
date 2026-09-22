import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import { getLLMProvider } from '../../ai';
import { retrieve, type RetrievedChunk } from '../../knowledge/retriever';
import { getLogger } from '../../logging';
import {
  EVIDENCE_STATUSES,
  FINDING_CATEGORIES,
  SEVERITIES,
} from '../../types/enums';
import type { CampaignContext } from '../../types/campaign';
import type { Evidence } from '../../types/evidence';
import type { Finding } from '../../types/finding';

const log = getLogger({ component: 'agents.compliance' });

const complianceOutputSchema = z.object({
  findings: z
    .array(
      z.object({
        category: z.enum(FINDING_CATEGORIES),
        severity: z.enum(SEVERITIES),
        title: z.string().min(3).max(300),
        explanation: z.string().min(3).max(2000),
        affectedContent: z.string().max(2000).optional(),
        confidence: z.number().min(0).max(1),
        uncertainty: z.string().max(1000).optional(),
        requiresHumanReview: z.boolean(),
        evidenceRequired: z.boolean(),
        evidenceStatus: z.enum(EVIDENCE_STATUSES),
        suggestedAction: z.string().max(1000).optional(),
        citedSourceIds: z.array(z.string()).max(10).default([]),
      }),
    )
    .max(20)
    .default([]),
});
type ComplianceOutput = z.infer<typeof complianceOutputSchema>;

const SYSTEM = `You are the Compliance Agent inside Guardrail, a marketing compliance review tool.

Your job is to identify potentially regulated / misleading / pricing / disclaimer / influencer-disclosure / brand-policy issues in a proposed marketing campaign.

Rules you MUST follow:
1. Do NOT invent regulations, policies, laws or authorities.
2. Only cite sources that appear in the "AVAILABLE EVIDENCE" section of the user message. Cite them by their sourceId string.
3. If a claim in the campaign is potentially problematic and NO evidence in AVAILABLE EVIDENCE supports it or contradicts it, set evidenceStatus to "NOT_FOUND" or "REQUIRES_HUMAN_REVIEW".
4. If evidence is present and supports/contradicts the claim, set evidenceStatus to "SUPPORTED" or "CONTRADICTED".
5. If the campaign has no issues, return findings: [].
6. Use "confidence" honestly. Under 0.6 must set requiresHumanReview to true.
7. Never assert public reaction. That is the Sentiment/Cultural agents' job.
8. Respond as JSON matching the ComplianceFindings schema.`;

export interface ComplianceAgentInput {
  analysisRunId: string;
  campaign: CampaignContext;
  topK?: number;
}

export interface ComplianceAgentOutput {
  findings: Finding[];
  usedEvidence: RetrievedChunk[];
}

export async function runComplianceAgent(
  input: ComplianceAgentInput,
): Promise<ComplianceAgentOutput> {
  const evidenceChunks = await retrieve({
    query: `${input.campaign.name}\n${input.campaign.copy}`,
    topK: input.topK ?? 6,
    filter: {
      sourceType: [
        'internal_policy',
        'brand_guideline',
        'approved_claim',
        'regulatory',
      ],
    },
  });

  const availableEvidence = evidenceChunks.map((c, i) => ({
    sourceId: `src_${i + 1}`,
    documentId: c.documentId,
    documentTitle: c.documentTitle,
    sourceType: c.sourceType,
    excerpt: c.content,
    score: c.score,
  }));

  const prompt = buildPrompt(input.campaign, availableEvidence);
  const llm = getLLMProvider();
  const { data } = await llm.completeStructured<ComplianceOutput>({
    schemaName: 'ComplianceFindings',
    schema: complianceOutputSchema,
    system: SYSTEM,
    prompt,
    temperature: 0.1,
  });

  log.debug({ count: data.findings.length }, 'compliance_agent_findings');

  const findings: Finding[] = data.findings.map((f) => {
    const cited = f.citedSourceIds
      .map((id) => availableEvidence.find((e) => e.sourceId === id))
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
    const evidence: Evidence[] = cited.map((c, i) => ({
      id: randomUUID(),
      findingId: '__pending__',
      sourceType: c.sourceType,
      sourceTitle: c.documentTitle,
      sourceDocumentId: c.documentId,
      chunkId: evidenceChunks.find((ec) => ec.documentId === c.documentId)?.chunkId,
      excerpt: c.excerpt.slice(0, 500),
      relevanceScore: Math.max(0, Math.min(1, c.score)),
      metadata: { rank: i + 1 },
      createdAt: new Date().toISOString(),
    }));

    let evidenceStatus = f.evidenceStatus;
    if (f.evidenceRequired && evidence.length === 0 && evidenceStatus === 'SUPPORTED') {
      evidenceStatus = 'NOT_FOUND';
    }

    const id = randomUUID();
    evidence.forEach((e) => (e.findingId = id));

    return {
      id,
      analysisRunId: input.analysisRunId,
      producedBy: 'compliance',
      category: f.category,
      severity: f.severity,
      title: f.title,
      explanation: f.explanation,
      affectedContent: f.affectedContent,
      confidence: f.confidence,
      uncertainty: f.uncertainty,
      requiresHumanReview: f.requiresHumanReview || f.confidence < 0.6,
      evidenceRequired: f.evidenceRequired,
      evidenceStatus,
      evidence,
      suggestedAction: f.suggestedAction,
      createdAt: new Date().toISOString(),
    };
  });

  return { findings, usedEvidence: evidenceChunks };
}

function buildPrompt(
  ctx: CampaignContext,
  evidence: Array<{ sourceId: string; documentTitle: string; sourceType: string; excerpt: string }>,
): string {
  const ev =
    evidence.length === 0
      ? '(no evidence retrieved — use evidenceStatus NOT_FOUND or REQUIRES_HUMAN_REVIEW for any finding that needs a source)'
      : evidence
          .map(
            (e) =>
              `- sourceId: ${e.sourceId}\n  type: ${e.sourceType}\n  title: ${e.documentTitle}\n  excerpt: """${e.excerpt.slice(0, 500).replace(/"""/g, "'''")}"""`,
          )
          .join('\n\n');

  return `CAMPAIGN CONTEXT
name: ${ctx.name}
type: ${ctx.campaignType}
platform: ${ctx.platform}
geography: ${ctx.geography.country}${ctx.geography.region ? ` / ${ctx.geography.region}` : ''}
festivalContext: ${ctx.festivalContext ? ctx.festivalContext.name : 'none'}
audienceSegments: ${ctx.audienceSegmentKeys.join(', ')}
applicablePolicyContext: ${ctx.applicablePolicyContext.join(', ') || 'none'}

CAMPAIGN COPY
"""
${ctx.copy}
"""

AVAILABLE EVIDENCE
${ev}

TASK
Return a JSON object of shape:
{ "findings": [ { category, severity, title, explanation, affectedContent, confidence, uncertainty, requiresHumanReview, evidenceRequired, evidenceStatus, suggestedAction, citedSourceIds } ] }

Cite sources ONLY from AVAILABLE EVIDENCE. If nothing above supports or contradicts the claim, do not fabricate — use evidenceStatus NOT_FOUND or REQUIRES_HUMAN_REVIEW.`;
}

export { complianceOutputSchema };
