import { NextResponse } from 'next/server';

import { audience } from '@guardrail/core';

import { apiError } from '@/lib/api-error';

export async function GET() {
  try {
    const list = await audience.listAudienceSegments();
    return NextResponse.json({ segments: list });
  } catch (err) {
    return apiError(err);
  }
}
