import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { config, errors, humanReview } from '@guardrail/core';

import { apiError } from '@/lib/api-error';

const resolveSchema = z.object({
  status: z.enum(['approved', 'rejected', 'changes_requested']),
  decision: z.string().max(2000).optional(),
  comments: z.string().max(4000).optional(),
  overrides: z.record(z.unknown()).optional(),
});

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const review = await humanReview.getReview(id);
    return NextResponse.json({ review });
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const cfg = config.loadConfig();
    const { id } = await ctx.params;
    const json = await req.json();
    const parsed = resolveSchema.safeParse(json);
    if (!parsed.success) {
      throw new errors.ValidationError('Invalid review payload', {
        issues: parsed.error.issues,
      });
    }
    await humanReview.resolveReview({
      reviewId: id,
      status: parsed.data.status,
      decision: parsed.data.decision,
      comments: parsed.data.comments,
      overrides: parsed.data.overrides,
      reviewerId: cfg.DEFAULT_REVIEWER_ID,
      reviewerName: cfg.DEFAULT_REVIEWER_NAME,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
