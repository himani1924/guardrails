import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { config, errors, humanReview } from '@guardrail/core';

import { apiError } from '@/lib/api-error';

const createSchema = z.object({
  campaignId: z.string().uuid(),
  analysisRunId: z.string().uuid().optional(),
});

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
    const reviewId = await humanReview.openReview({
      campaignId: parsed.data.campaignId,
      analysisRunId: parsed.data.analysisRunId ?? null,
      reviewerId: cfg.DEFAULT_REVIEWER_ID,
      reviewerName: cfg.DEFAULT_REVIEWER_NAME,
    });
    return NextResponse.json({ reviewId }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
