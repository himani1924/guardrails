import { NextResponse, type NextRequest } from 'next/server';

import { analyses } from '@guardrail/core';

import { apiError } from '@/lib/api-error';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ runId: string }> }) {
  try {
    const { runId } = await ctx.params;
    const result = await analyses.getAnalysisRun(runId);
    return NextResponse.json({ analysis: result });
  } catch (err) {
    return apiError(err);
  }
}
