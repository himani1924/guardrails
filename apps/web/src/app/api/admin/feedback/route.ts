import { NextResponse } from 'next/server';

import { feedback } from '@guardrail/core';

import { apiError } from '@/lib/api-error';

export async function GET() {
  try {
    const summary = await feedback.summariseFeedback();
    return NextResponse.json({ summary });
  } catch (err) {
    return apiError(err);
  }
}
