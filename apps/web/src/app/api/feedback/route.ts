import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { config, errors, feedback } from '@guardrail/core';

import { apiError } from '@/lib/api-error';

const feedbackSchema = z.object({
  campaignId: z.string().uuid(),
  analysisRunId: z.string().uuid().optional(),
  findingId: z.string().uuid().optional(),
  recommendationId: z.string().uuid().optional(),
  humanReviewId: z.string().uuid().optional(),
  action: z.enum([
    'finding_accepted',
    'finding_rejected',
    'finding_severity_changed',
    'recommendation_accepted',
    'recommendation_rejected',
    'comment',
  ]),
  payload: z.record(z.unknown()).optional(),
  comments: z.string().max(4000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const cfg = config.loadConfig();
    const json = await req.json();
    const parsed = feedbackSchema.safeParse(json);
    if (!parsed.success) {
      throw new errors.ValidationError('Invalid feedback payload', {
        issues: parsed.error.issues,
      });
    }
    const id = await feedback.recordFeedback({
      ...parsed.data,
      reviewerId: cfg.DEFAULT_REVIEWER_ID,
      reviewerName: cfg.DEFAULT_REVIEWER_NAME,
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
