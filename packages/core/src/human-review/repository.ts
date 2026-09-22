import { desc, eq } from 'drizzle-orm';

import { getDb } from '../db/client';
import { campaigns, humanReviews } from '../db/schema';
import type { HumanReviewRow } from '../db/schema';
import { NotFoundError } from '../errors';
import { recordAuditEvent } from '../audit/service';
import type { HumanReviewStatus } from '../types/enums';

export interface HumanReviewSummary {
  id: string;
  campaignId: string;
  campaignName: string;
  analysisRunId: string | null;
  status: HumanReviewStatus;
  reviewerId: string;
  reviewerName: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export async function openReview(input: {
  campaignId: string;
  analysisRunId: string | null;
  reviewerId: string;
  reviewerName?: string;
}): Promise<string> {
  const db = getDb();
  const [inserted] = await db
    .insert(humanReviews)
    .values({
      campaignId: input.campaignId,
      analysisRunId: input.analysisRunId,
      reviewerId: input.reviewerId,
      reviewerName: input.reviewerName,
      status: 'pending',
    })
    .returning({ id: humanReviews.id });
  if (!inserted) throw new Error('Failed to open review');

  await recordAuditEvent({
    actor: { kind: 'system', component: 'human-review' },
    action: 'review_opened',
    entityType: 'human_review',
    entityId: inserted.id,
    metadata: { campaignId: input.campaignId },
  });
  return inserted.id;
}

export async function resolveReview(input: {
  reviewId: string;
  status: Exclude<HumanReviewStatus, 'pending'>;
  decision?: string;
  comments?: string;
  overrides?: Record<string, unknown>;
  reviewerId: string;
  reviewerName?: string;
}): Promise<void> {
  const db = getDb();
  const existing = await db.query.humanReviews.findFirst({
    where: eq(humanReviews.id, input.reviewId),
  });
  if (!existing) throw new NotFoundError('Review not found', { id: input.reviewId });

  await db
    .update(humanReviews)
    .set({
      status: input.status,
      decision: input.decision,
      comments: input.comments,
      overrides: input.overrides,
      reviewerId: input.reviewerId,
      reviewerName: input.reviewerName,
      resolvedAt: new Date(),
    })
    .where(eq(humanReviews.id, input.reviewId));

  await db
    .update(campaigns)
    .set({
      status:
        input.status === 'approved'
          ? 'approved'
          : input.status === 'rejected'
            ? 'rejected'
            : 'in_review',
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, existing.campaignId));

  await recordAuditEvent({
    actor: { kind: 'user', userId: input.reviewerId, name: input.reviewerName },
    action: `review_${input.status}`,
    entityType: 'human_review',
    entityId: input.reviewId,
    metadata: {
      campaignId: existing.campaignId,
      overrides: input.overrides,
    },
    summary: input.decision,
  });
}

export async function listReviews(): Promise<HumanReviewSummary[]> {
  const db = getDb();
  const rows = await db
    .select({
      review: humanReviews,
      campaignName: campaigns.name,
    })
    .from(humanReviews)
    .innerJoin(campaigns, eq(humanReviews.campaignId, campaigns.id))
    .orderBy(desc(humanReviews.createdAt));

  return rows.map(({ review, campaignName }) => summarise(review, campaignName));
}

export async function getReview(id: string): Promise<HumanReviewSummary & {
  decision: string | null;
  comments: string | null;
  overrides: Record<string, unknown> | null;
}> {
  const db = getDb();
  const row = await db
    .select({ review: humanReviews, campaignName: campaigns.name })
    .from(humanReviews)
    .innerJoin(campaigns, eq(humanReviews.campaignId, campaigns.id))
    .where(eq(humanReviews.id, id))
    .then((r) => r[0]);
  if (!row) throw new NotFoundError('Review not found', { id });
  const base = summarise(row.review, row.campaignName);
  return {
    ...base,
    decision: row.review.decision,
    comments: row.review.comments,
    overrides: row.review.overrides,
  };
}

export async function findPendingReviewForCampaign(campaignId: string): Promise<HumanReviewRow | null> {
  const db = getDb();
  const row = await db.query.humanReviews.findFirst({
    where: eq(humanReviews.campaignId, campaignId),
    orderBy: desc(humanReviews.createdAt),
  });
  if (!row || row.status !== 'pending') return null;
  return row;
}

function summarise(review: HumanReviewRow, campaignName: string): HumanReviewSummary {
  return {
    id: review.id,
    campaignId: review.campaignId,
    campaignName,
    analysisRunId: review.analysisRunId,
    status: review.status,
    reviewerId: review.reviewerId,
    reviewerName: review.reviewerName,
    createdAt: review.createdAt.toISOString(),
    resolvedAt: review.resolvedAt?.toISOString() ?? null,
  };
}
