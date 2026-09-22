import { NextResponse, type NextRequest } from 'next/server';

import { campaigns as campaignsModule, errors } from '@guardrail/core';

import { apiError } from '@/lib/api-error';
import { guardCampaignInput } from '@/lib/prompt-guard';
import { rateLimit } from '@/lib/rate-limit';

export async function GET() {
  try {
    const list = await campaignsModule.listCampaigns();
    return NextResponse.json({ campaigns: list });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const key = req.headers.get('x-forwarded-for') ?? 'local';
    const rl = rateLimit(`campaigns:create:${key}`, { max: 30 });
    if (!rl.ok) {
      throw new errors.AppError({
        code: 'RATE_LIMITED',
        message: 'Too many campaign creations. Slow down.',
        httpStatus: 429,
      });
    }
    const json = await req.json();
    const parsed = campaignsModule.createCampaignSchema.safeParse(json);
    if (!parsed.success) {
      throw new errors.ValidationError('Invalid campaign payload', {
        issues: parsed.error.issues,
      });
    }
    guardCampaignInput({ name: parsed.data.name, copy: parsed.data.copy });
    const created = await campaignsModule.createCampaign(parsed.data);
    return NextResponse.json({ campaign: created }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
