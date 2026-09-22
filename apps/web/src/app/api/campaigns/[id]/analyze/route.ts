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
    // #region agent log
    fetch('http://127.0.0.1:7322/ingest/363266d2-671e-41b8-8614-9660cd345a57',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0685fc'},body:JSON.stringify({sessionId:'0685fc',runId:'pre-fix',hypothesisId:'D',location:'apps/web/src/app/api/campaigns/[id]/analyze/route.ts:POST',message:'analyze started',data:{campaignId:id,llmProvider:cfg.LLM_PROVIDER,embeddingProvider:cfg.EMBEDDING_PROVIDER,nodeEnv:cfg.NODE_ENV},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
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
