import { desc, eq, sql } from 'drizzle-orm';

import { recordAuditEvent } from '../audit/service';
import { getDb } from '../db/client';
import { feedbackEvents, findings } from '../db/schema';

export interface RecordFeedbackInput {
  campaignId: string;
  analysisRunId?: string;
  findingId?: string;
  recommendationId?: string;
  humanReviewId?: string;
  action: string;
  reviewerId: string;
  reviewerName?: string;
  payload?: Record<string, unknown>;
  comments?: string;
}

export async function recordFeedback(input: RecordFeedbackInput): Promise<string> {
  const db = getDb();
  const [inserted] = await db
    .insert(feedbackEvents)
    .values({
      campaignId: input.campaignId,
      analysisRunId: input.analysisRunId,
      findingId: input.findingId,
      recommendationId: input.recommendationId,
      humanReviewId: input.humanReviewId,
      action: input.action,
      reviewerId: input.reviewerId,
      reviewerName: input.reviewerName,
      payload: input.payload,
      comments: input.comments,
    })
    .returning({ id: feedbackEvents.id });
  if (!inserted) throw new Error('Failed to record feedback');

  await recordAuditEvent({
    actor: { kind: 'user', userId: input.reviewerId, name: input.reviewerName },
    action: `feedback_${input.action}`,
    entityType: 'campaign',
    entityId: input.campaignId,
    metadata: { findingId: input.findingId, recommendationId: input.recommendationId },
    summary: input.comments,
  });

  return inserted.id;
}

export interface FeedbackAdminSummary {
  totalEvents: number;
  byAction: Array<{ action: string; count: number }>;
  disagreementRate: number;
  recentFindingActions: Array<{
    findingId: string;
    findingTitle: string;
    findingCategory: string;
    action: string;
    createdAt: string;
    reviewerName: string | null;
    comments: string | null;
  }>;
}

export async function summariseFeedback(): Promise<FeedbackAdminSummary> {
  const db = getDb();
  const [totalRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(feedbackEvents);
  const byActionRows = await db
    .select({
      action: feedbackEvents.action,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(feedbackEvents)
    .groupBy(feedbackEvents.action);

  const [reject] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(feedbackEvents)
    .where(eq(feedbackEvents.action, 'finding_rejected'));

  const recent = await db
    .select({
      findingId: findings.id,
      findingTitle: findings.title,
      findingCategory: findings.category,
      action: feedbackEvents.action,
      createdAt: feedbackEvents.createdAt,
      reviewerName: feedbackEvents.reviewerName,
      comments: feedbackEvents.comments,
    })
    .from(feedbackEvents)
    .innerJoin(findings, eq(feedbackEvents.findingId, findings.id))
    .orderBy(desc(feedbackEvents.createdAt))
    .limit(20);

  const total = totalRow?.count ?? 0;
  const disagreement = total > 0 ? (reject?.count ?? 0) / total : 0;

  return {
    totalEvents: total,
    byAction: byActionRows.map((r) => ({ action: r.action, count: Number(r.count) })),
    disagreementRate: Math.round(disagreement * 1000) / 1000,
    recentFindingActions: recent.map((r) => ({
      findingId: r.findingId,
      findingTitle: r.findingTitle,
      findingCategory: r.findingCategory,
      action: r.action,
      createdAt: r.createdAt.toISOString(),
      reviewerName: r.reviewerName ?? null,
      comments: r.comments ?? null,
    })),
  };
}
