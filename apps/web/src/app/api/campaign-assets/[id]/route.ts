import { NextResponse, type NextRequest } from 'next/server';

import { campaigns as campaignsModule, errors } from '@guardrail/core';

import { apiError } from '@/lib/api-error';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_TYPES = new Set<string>(campaignsModule.IMAGE_MIME_TYPES);

/** Serves the stored bytes of an uploaded campaign image (thumbnails/previews). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) throw new errors.NotFoundError('Asset not found', { id });
    const file = await campaignsModule.getCampaignAssetFile(id);
    if (!file) throw new errors.NotFoundError('Asset file not found', { id });
    return new NextResponse(new Uint8Array(file.data), {
      headers: {
        'content-type': SAFE_TYPES.has(file.mimeType) ? file.mimeType : 'application/octet-stream',
        'content-length': String(file.byteSize),
        'cache-control': 'private, max-age=3600',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch (err) {
    return apiError(err);
  }
}
