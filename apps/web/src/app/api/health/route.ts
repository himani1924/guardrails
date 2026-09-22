import { NextResponse } from 'next/server';

import { config } from '@guardrail/core';

import { apiError } from '@/lib/api-error';

export async function GET() {
  try {
    const cfg = config.loadConfig();
    return NextResponse.json({
      status: 'ok',
      service: 'guardrail',
      env: cfg.NODE_ENV,
      llmProvider: cfg.LLM_PROVIDER,
      embeddingProvider: cfg.EMBEDDING_PROVIDER,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return apiError(err);
  }
}
