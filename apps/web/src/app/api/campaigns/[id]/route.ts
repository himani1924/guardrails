import { NextResponse, type NextRequest } from 'next/server';

import { campaigns as campaignsModule, errors } from '@guardrail/core';

import { apiError } from '@/lib/api-error';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const campaign = await campaignsModule.getCampaignById(id);
    return NextResponse.json({ campaign });
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const json = await req.json();
    const parsed = campaignsModule.updateCampaignSchema.safeParse(json);
    if (!parsed.success) {
      throw new errors.ValidationError('Invalid campaign payload', {
        issues: parsed.error.issues,
      });
    }
    const updated = await campaignsModule.updateCampaign(id, parsed.data);
    return NextResponse.json({ campaign: updated });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    await campaignsModule.deleteCampaign(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
