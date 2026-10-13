import { NextResponse, type NextRequest } from 'next/server';

import { config, errors, orchestrator } from '@guardrail/core';

import { apiError } from '@/lib/api-error';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const key = req.headers.get('x-forwarded-for') ?? 'local';
    const rl = rateLimit(`analyze:${key}:${id}`, { max: 10, windowMs: 60_000 });
    if (!rl.ok) {
      throw new errors.AppError({
        code: 'RATE_LIMITED',
        message: 'Too many analysis requests for this campaign.',
        httpStatus: 429,
      });
    }
    const cfg = config.loadConfig();
    const result = await orchestrator.runAnalysis({
      campaignId: id,
      requestedBy: cfg.DEFAULT_REVIEWER_ID,
    });
    return NextResponse.json(result, {
      status: result.status === 'completed' ? 200 : 500,
    });
  } catch (err) {
    return apiError(err);
  }
}
