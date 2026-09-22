import { getLLMProvider } from '../ai';
import {
  aggregateRisks,
  runAudienceAgent,
  runComplianceAgent,
  runCulturalAgent,
  runRecommendationAgent,
  runSentimentAgent,
} from '../agents';
import { recordAuditEvent } from '../audit/service';
import { getCampaignById, updateCampaignStatus } from '../campaigns/repository';
import { getLogger } from '../logging';
import { runRuleEngine } from '../rules/engine';
import type { CampaignContext } from '../types/campaign';
import type { Finding } from '../types/finding';
import type { Recommendation } from '../types/recommendation';
import { randomUUID } from 'node:crypto';

import {
  completeAnalysisRun,
  createAnalysisRun,
  getAnalysisRun,
  persistAnalysisOutput,
} from './repository';

const log = getLogger({ component: 'orchestrator' });

export interface RunAnalysisInput {
  campaignId: string;
  requestedBy?: string;
}

export interface RunAnalysisResult {
  analysisRunId: string;
  status: 'completed' | 'failed';
}

/**
 * Runs the full analysis pipeline as a deterministic workflow.
 *
 * Order:
 *   1. Rule engine (deterministic)
 *   2. Compliance Agent (RAG)
 *   3. Sentiment Agent
 *   4. Cultural Context Agent (RAG) — only if applicable
 *   5. Audience Perspective Simulation
 *   6. Aggregate risks (deterministic)
 *   7. Recommendation Agent
 *   8. Persist + audit + set campaign status
 */
export async function runAnalysis(input: RunAnalysisInput): Promise<RunAnalysisResult> {
  const started = Date.now();
  const campaign = await getCampaignById(input.campaignId);
  const llm = getLLMProvider();

  const analysisRunId = await createAnalysisRun({
    campaignId: input.campaignId,
    requestedBy: input.requestedBy,
    provider: llm.name,
    model: llm.name === 'mock' ? 'mock' : 'openai-configured',
  });

  await updateCampaignStatus(input.campaignId, 'analyzing');
  await recordAuditEvent({
    actor: { kind: 'system', component: 'orchestrator' },
    action: 'analysis_started',
    entityType: 'campaign',
    entityId: input.campaignId,
    metadata: { analysisRunId },
  });

  const ctx: CampaignContext = {
    campaignId: campaign.id,
    name: campaign.name,
    copy: campaign.copy,
    campaignType: campaign.campaignType,
    platform: campaign.platform,
    geography: campaign.geography,
    festivalContext: campaign.festivalContext,
    audienceSegmentKeys: campaign.audienceSegmentIds,
    assets: campaign.assets,
    applicablePolicyContext: [],
  };

  try {
    const rules = runRuleEngine(ctx, analysisRunId);
    await recordAuditEvent({
      actor: { kind: 'agent', agent: 'rule_engine' },
      action: 'agent_completed',
      entityType: 'analysis_run',
      entityId: analysisRunId,
      metadata: {
        evaluatedRules: rules.evaluatedRuleIds,
        findings: rules.findings.length,
      },
    });

    const compliance = await runAgentWithAudit('compliance', analysisRunId, () =>
      runComplianceAgent({ analysisRunId, campaign: ctx }),
    );

    const sentiment = await runAgentWithAudit('sentiment', analysisRunId, () =>
      runSentimentAgent({ analysisRunId, campaign: ctx }),
    );

    const cultural = ctx.festivalContext
      ? await runAgentWithAudit('cultural', analysisRunId, () =>
          runCulturalAgent({ analysisRunId, campaign: ctx }),
        )
      : { findings: [], usedEvidence: [] };

    const audience = await runAgentWithAudit('audience', analysisRunId, () =>
      runAudienceAgent({ analysisRunId, campaign: ctx }),
    );

    const allFindings = [
      ...rules.findings,
      ...compliance.findings,
      ...sentiment.findings,
      ...cultural.findings,
      ...audience.findings,
    ];

    const risks = aggregateRisks({
      findings: allFindings,
      perspectives: audience.perspectives ?? [],
      analysisRunId,
    });

    const recommendation = await runAgentWithAudit('recommendation', analysisRunId, () =>
      runRecommendationAgent({ analysisRunId, campaign: ctx, findings: allFindings }),
    );

    const withFallback = ensureRecommendationCoverage(
      analysisRunId,
      allFindings,
      recommendation.recommendations,
    );

    await persistAnalysisOutput({
      analysisRunId,
      findings: allFindings,
      risks,
      recommendations: withFallback,
      perspectives: audience.perspectives ?? [],
    });

    const requiresReview = risks.some((r) => r.humanReviewRequired);
    await updateCampaignStatus(
      input.campaignId,
      requiresReview ? 'in_review' : 'analyzed',
    );

    await completeAnalysisRun(analysisRunId, {
      status: 'completed',
      latencyMs: Date.now() - started,
    });

    await recordAuditEvent({
      actor: { kind: 'system', component: 'orchestrator' },
      action: 'analysis_completed',
      entityType: 'analysis_run',
      entityId: analysisRunId,
      metadata: {
        campaignId: input.campaignId,
        totalFindings: allFindings.length,
        risks: risks.map((r) => ({ dim: r.dimension, level: r.level })),
        requiresReview,
      },
    });

    log.info({ analysisRunId, findings: allFindings.length }, 'analysis_completed');
    return { analysisRunId, status: 'completed' };
  } catch (err) {
    log.error({ err, analysisRunId }, 'analysis_failed');
    await completeAnalysisRun(analysisRunId, {
      status: 'failed',
      error: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - started,
    });
    await updateCampaignStatus(input.campaignId, 'ready_for_analysis');
    await recordAuditEvent({
      actor: { kind: 'system', component: 'orchestrator' },
      action: 'analysis_failed',
      entityType: 'analysis_run',
      entityId: analysisRunId,
      metadata: { error: err instanceof Error ? err.message : String(err) },
    });
    return { analysisRunId, status: 'failed' };
  }
}

/**
 * Deterministic fallback that guarantees every finding requiring evidence or
 * human review has at least one recommendation attached. The LLM's
 * recommendations are kept as-is; we only fill in gaps.
 */
function ensureRecommendationCoverage(
  analysisRunId: string,
  findings: Finding[],
  fromAgent: Recommendation[],
): Recommendation[] {
  const covered = new Set(fromAgent.map((r) => r.findingId));
  const now = new Date().toISOString();
  const extras: Recommendation[] = [];
  for (const f of findings) {
    if (covered.has(f.id)) continue;
    if (
      f.evidenceRequired &&
      (f.evidenceStatus === 'NOT_FOUND' ||
        f.evidenceStatus === 'INSUFFICIENT_EVIDENCE' ||
        f.evidenceStatus === 'REQUIRES_HUMAN_REVIEW' ||
        f.evidenceStatus === 'CONTRADICTED')
    ) {
      extras.push({
        id: randomUUID(),
        analysisRunId,
        findingId: f.id,
        action: 'add_evidence',
        originalContent: f.affectedContent,
        reason:
          'This finding is flagged as requiring supporting evidence but none was verified. Attach an approved reference or soften the claim.',
        confidence: 0.7,
        status: 'proposed',
        createdAt: now,
      });
      continue;
    }
    if (f.requiresHumanReview) {
      extras.push({
        id: randomUUID(),
        analysisRunId,
        findingId: f.id,
        action: 'legal_review',
        originalContent: f.affectedContent,
        reason: 'AI confidence or severity indicates human review is needed.',
        confidence: 0.6,
        status: 'proposed',
        createdAt: now,
      });
    }
  }
  return [...fromAgent, ...extras];
}

async function runAgentWithAudit<T>(
  name: string,
  analysisRunId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const started = Date.now();
  try {
    const out = await fn();
    await recordAuditEvent({
      actor: { kind: 'agent', agent: name },
      action: 'agent_completed',
      entityType: 'analysis_run',
      entityId: analysisRunId,
      metadata: { latencyMs: Date.now() - started },
    });
    return out;
  } catch (err) {
    await recordAuditEvent({
      actor: { kind: 'agent', agent: name },
      action: 'agent_failed',
      entityType: 'analysis_run',
      entityId: analysisRunId,
      metadata: {
        latencyMs: Date.now() - started,
        error: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }
}

export { getAnalysisRun };
