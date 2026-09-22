import { asc, desc, eq } from 'drizzle-orm';

import { getDb } from '../db/client';
import {
  analysisRuns,
  audiencePerspectiveResults,
  evidence,
  findings,
  recommendations,
  riskAssessments,
} from '../db/schema';
import type {
  AnalysisRunRow,
  AudiencePerspectiveResultRow,
  EvidenceRow,
  FindingRow,
  RecommendationRow,
  RiskAssessmentRow,
} from '../db/schema';
import { NotFoundError } from '../errors';
import type { AnalysisResult } from '../types/analysis';
import type { AudiencePerspectiveResult } from '../types/audience';
import type { Evidence } from '../types/evidence';
import type { Finding } from '../types/finding';
import type { Recommendation } from '../types/recommendation';
import type { RiskAssessment } from '../types/risk';

export async function createAnalysisRun(input: {
  campaignId: string;
  requestedBy?: string;
  provider?: string;
  model?: string;
}): Promise<string> {
  const db = getDb();
  const [inserted] = await db
    .insert(analysisRuns)
    .values({
      campaignId: input.campaignId,
      requestedBy: input.requestedBy,
      provider: input.provider,
      model: input.model,
      status: 'running',
    })
    .returning({ id: analysisRuns.id });
  if (!inserted) throw new Error('Failed to insert analysis run');
  return inserted.id;
}

export async function completeAnalysisRun(
  runId: string,
  patch: {
    totalPromptTokens?: number;
    totalCompletionTokens?: number;
    latencyMs?: number;
    error?: string;
    status: 'completed' | 'failed' | 'cancelled';
  },
): Promise<void> {
  const db = getDb();
  await db
    .update(analysisRuns)
    .set({
      status: patch.status,
      totalPromptTokens: patch.totalPromptTokens,
      totalCompletionTokens: patch.totalCompletionTokens,
      latencyMs: patch.latencyMs,
      error: patch.error,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(analysisRuns.id, runId));
}

export async function persistAnalysisOutput(input: {
  analysisRunId: string;
  findings: Finding[];
  risks: RiskAssessment[];
  recommendations: Recommendation[];
  perspectives: AudiencePerspectiveResult[];
}): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    if (input.findings.length > 0) {
      const findingRows = input.findings.map((f) => ({
        id: f.id,
        analysisRunId: input.analysisRunId,
        producedBy: f.producedBy,
        category: f.category,
        severity: f.severity,
        title: f.title,
        explanation: f.explanation,
        affectedContent: f.affectedContent,
        confidence: String(f.confidence),
        uncertainty: f.uncertainty,
        requiresHumanReview: f.requiresHumanReview,
        evidenceRequired: f.evidenceRequired,
        evidenceStatus: f.evidenceStatus,
        suggestedAction: f.suggestedAction,
        ruleId: f.ruleId,
      }));
      await tx.insert(findings).values(findingRows);

      const evidenceRows = input.findings.flatMap((f) =>
        f.evidence.map((e) => ({
          id: e.id,
          findingId: f.id,
          sourceType: e.sourceType,
          sourceTitle: e.sourceTitle,
          sourceDocumentId: e.sourceDocumentId,
          chunkId: e.chunkId,
          excerpt: e.excerpt,
          relevanceScore: String(e.relevanceScore),
          metadata: e.metadata,
        })),
      );
      if (evidenceRows.length > 0) await tx.insert(evidence).values(evidenceRows);
    }

    if (input.risks.length > 0) {
      await tx.insert(riskAssessments).values(
        input.risks.map((r) => ({
          id: r.id,
          analysisRunId: input.analysisRunId,
          dimension: r.dimension,
          level: r.level,
          reasons: r.reasons,
          supportingFindingIds: r.supportingFindingIds,
          confidence: String(r.confidence),
          uncertainty: r.uncertainty,
          humanReviewRequired: r.humanReviewRequired,
        })),
      );
    }

    if (input.recommendations.length > 0) {
      await tx.insert(recommendations).values(
        input.recommendations.map((r) => ({
          id: r.id,
          analysisRunId: input.analysisRunId,
          findingId: r.findingId,
          action: r.action,
          originalContent: r.originalContent,
          suggestedModification: r.suggestedModification,
          reason: r.reason,
          confidence: String(r.confidence),
          status: r.status,
        })),
      );
    }

    if (input.perspectives.length > 0) {
      await tx.insert(audiencePerspectiveResults).values(
        input.perspectives.map((p) => ({
          id: p.id,
          analysisRunId: input.analysisRunId,
          audienceSegmentId: p.audienceSegmentId,
          audienceSegmentKey: p.audienceSegmentKey,
          possibleInterpretation: p.possibleInterpretation,
          positiveSignals: p.positiveSignals,
          concernSignals: p.concernSignals,
          ambiguity: p.ambiguity,
          potentialSensitivity: p.potentialSensitivity,
          confidence: String(p.confidence),
        })),
      );
    }
  });
}

function toEvidence(row: EvidenceRow): Evidence {
  return {
    id: row.id,
    findingId: row.findingId,
    sourceType: row.sourceType,
    sourceTitle: row.sourceTitle,
    sourceDocumentId: row.sourceDocumentId,
    chunkId: row.chunkId ?? undefined,
    excerpt: row.excerpt,
    relevanceScore: Number(row.relevanceScore),
    metadata: row.metadata ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

function toFinding(row: FindingRow, ev: Evidence[]): Finding {
  return {
    id: row.id,
    analysisRunId: row.analysisRunId,
    producedBy: row.producedBy,
    category: row.category,
    severity: row.severity,
    title: row.title,
    explanation: row.explanation,
    affectedContent: row.affectedContent ?? undefined,
    confidence: Number(row.confidence),
    uncertainty: row.uncertainty ?? undefined,
    requiresHumanReview: row.requiresHumanReview,
    evidenceRequired: row.evidenceRequired,
    evidenceStatus: row.evidenceStatus,
    evidence: ev,
    suggestedAction: row.suggestedAction ?? undefined,
    ruleId: row.ruleId ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

function toRisk(row: RiskAssessmentRow): RiskAssessment {
  return {
    id: row.id,
    analysisRunId: row.analysisRunId,
    dimension: row.dimension,
    level: row.level,
    reasons: row.reasons,
    supportingFindingIds: row.supportingFindingIds,
    confidence: Number(row.confidence),
    uncertainty: row.uncertainty ?? undefined,
    humanReviewRequired: row.humanReviewRequired,
    createdAt: row.createdAt.toISOString(),
  };
}

function toRecommendation(row: RecommendationRow): Recommendation {
  return {
    id: row.id,
    analysisRunId: row.analysisRunId,
    findingId: row.findingId,
    action: row.action,
    originalContent: row.originalContent ?? undefined,
    suggestedModification: row.suggestedModification ?? undefined,
    reason: row.reason,
    confidence: Number(row.confidence),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

function toPerspective(row: AudiencePerspectiveResultRow): AudiencePerspectiveResult {
  return {
    id: row.id,
    analysisRunId: row.analysisRunId,
    audienceSegmentId: row.audienceSegmentId,
    audienceSegmentKey: row.audienceSegmentKey,
    possibleInterpretation: row.possibleInterpretation,
    positiveSignals: row.positiveSignals,
    concernSignals: row.concernSignals,
    ambiguity: row.ambiguity ?? undefined,
    potentialSensitivity: row.potentialSensitivity ?? undefined,
    confidence: Number(row.confidence),
    createdAt: row.createdAt.toISOString(),
  };
}

function toAnalysisResult(
  runRow: AnalysisRunRow,
  findingRows: FindingRow[],
  evidenceRows: EvidenceRow[],
  riskRows: RiskAssessmentRow[],
  recRows: RecommendationRow[],
  perspectiveRows: AudiencePerspectiveResultRow[],
): AnalysisResult {
  const evidenceByFinding = new Map<string, Evidence[]>();
  for (const e of evidenceRows) {
    const list = evidenceByFinding.get(e.findingId) ?? [];
    list.push(toEvidence(e));
    evidenceByFinding.set(e.findingId, list);
  }
  return {
    runId: runRow.id,
    campaignId: runRow.campaignId,
    status: runRow.status,
    startedAt: runRow.startedAt.toISOString(),
    completedAt: runRow.completedAt?.toISOString(),
    provider: runRow.provider ?? undefined,
    model: runRow.model ?? undefined,
    findings: findingRows.map((f) => toFinding(f, evidenceByFinding.get(f.id) ?? [])),
    risks: riskRows.map(toRisk),
    recommendations: recRows.map(toRecommendation),
    audiencePerspectives: perspectiveRows.map(toPerspective),
    totalPromptTokens: runRow.totalPromptTokens ?? undefined,
    totalCompletionTokens: runRow.totalCompletionTokens ?? undefined,
    latencyMs: runRow.latencyMs ?? undefined,
    error: runRow.error ?? undefined,
  };
}

export async function getAnalysisRun(runId: string): Promise<AnalysisResult> {
  const db = getDb();
  const run = await db.query.analysisRuns.findFirst({ where: eq(analysisRuns.id, runId) });
  if (!run) throw new NotFoundError('Analysis run not found', { runId });
  return getAnalysisRunUsing(run);
}

export async function getLatestAnalysisRunForCampaign(
  campaignId: string,
): Promise<AnalysisResult | null> {
  const db = getDb();
  const run = await db.query.analysisRuns.findFirst({
    where: eq(analysisRuns.campaignId, campaignId),
    orderBy: desc(analysisRuns.startedAt),
  });
  if (!run) return null;
  return getAnalysisRunUsing(run);
}

async function getAnalysisRunUsing(run: AnalysisRunRow): Promise<AnalysisResult> {
  const db = getDb();
  const [findingRows, riskRows, recRows, perspectiveRows] = await Promise.all([
    db.select().from(findings).where(eq(findings.analysisRunId, run.id)).orderBy(asc(findings.createdAt)),
    db.select().from(riskAssessments).where(eq(riskAssessments.analysisRunId, run.id)),
    db.select().from(recommendations).where(eq(recommendations.analysisRunId, run.id)),
    db.select().from(audiencePerspectiveResults).where(eq(audiencePerspectiveResults.analysisRunId, run.id)),
  ]);
  const findingIds = findingRows.map((f) => f.id);
  const evidenceRows = findingIds.length
    ? await db
        .select()
        .from(evidence)
        .where(inArrayNonEmpty(evidence.findingId, findingIds))
    : [];
  return toAnalysisResult(run, findingRows, evidenceRows, riskRows, recRows, perspectiveRows);
}

// Local helper — avoids optional import cycle with drizzle's `inArray`.
import { inArray } from 'drizzle-orm';
function inArrayNonEmpty<T>(col: Parameters<typeof inArray>[0], values: T[]) {
  return inArray(col, values as never);
}
