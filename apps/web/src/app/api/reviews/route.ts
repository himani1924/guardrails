import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { analyses, config, errors, humanReview } from '@guardrail/core';

import { apiError } from '@/lib/api-error';

const createSchema = z.object({
  campaignId: z.string().uuid(),
  analysisRunId: z.string().uuid().optional(),
});

function analysisNeedsHumanReview(result: {
  risks: { humanReviewRequired: boolean }[];
  findings: { requiresHumanReview: boolean }[];
}): boolean {
  return (
    result.risks.some((r) => r.humanReviewRequired) ||
    result.findings.some((f) => f.requiresHumanReview)
  );
}

export async function GET() {
  try {
    const list = await humanReview.listReviews();
    return NextResponse.json({ reviews: list });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const cfg = config.loadConfig();
    const json = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      throw new errors.ValidationError('Invalid review payload', {
        issues: parsed.error.issues,
      });
    }

    const analysis = parsed.data.analysisRunId
      ? await analyses.getAnalysisRun(parsed.data.analysisRunId)
      : await analyses.getLatestAnalysisRunForCampaign(parsed.data.campaignId);

    if (!analysis || analysis.status !== 'completed') {
      throw new errors.ValidationError(
        'A completed analysis is required before opening a review.',
      );
    }

    if (!analysisNeedsHumanReview(analysis)) {
      throw new errors.ValidationError(
        'Human review is not required for this analysis. Accept the campaign on the analysis page instead.',
      );
    }

    const existing = await humanReview.findPendingReviewForCampaign(
      parsed.data.campaignId,
    );
    if (existing) {
      return NextResponse.json({ reviewId: existing.id, reused: true });
    }

    const reviewId = await humanReview.openReview({
      campaignId: parsed.data.campaignId,
      analysisRunId: parsed.data.analysisRunId ?? analysis.runId,
      reviewerId: cfg.DEFAULT_REVIEWER_ID,
      reviewerName: cfg.DEFAULT_REVIEWER_NAME,
    });
    return NextResponse.json({ reviewId }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
