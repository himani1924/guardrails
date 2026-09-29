import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { knowledge, errors } from '@guardrail/core';

import { apiError } from '@/lib/api-error';
import { rateLimit } from '@/lib/rate-limit';

const createSchema = z.object({
  title: z.string().min(3).max(300),
  sourceType: z.enum([
    'internal_policy',
    'brand_guideline',
    'approved_claim',
    'regulatory',
    'historical_campaign',
    'other',
  ]),
  category: z.string().max(100).optional(),
  geography: z.string().max(10).optional(),
  documentType: z.string().max(100).optional(),
  content: z.string().min(20).max(200_000),
});

export async function GET() {
  try {
    const documents = await knowledge.listDocuments();
    return NextResponse.json({
      documents: documents.map((d) => ({
        id: d.id,
        title: d.title,
        sourceType: d.sourceType,
        category: d.category,
        geography: d.geography,
        documentType: d.documentType,
        createdAt: d.createdAt,
        // Preview only — full body available for editors via separate fetch if needed
        contentPreview: d.content.slice(0, 280),
        contentLength: d.content.length,
      })),
    });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const key = req.headers.get('x-forwarded-for') ?? 'local';
    const rl = rateLimit(`knowledge:create:${key}`, { max: 20 });
    if (!rl.ok) {
      throw new errors.AppError({
        code: 'RATE_LIMITED',
        message: 'Too many knowledge uploads. Slow down.',
        httpStatus: 429,
      });
    }

    const json = await req.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      throw new errors.ValidationError('Invalid knowledge document', {
        issues: parsed.error.issues,
      });
    }

    const id = await knowledge.ingestDocument({
      title: parsed.data.title,
      sourceType: parsed.data.sourceType,
      category: parsed.data.category,
      geography: parsed.data.geography,
      documentType: parsed.data.documentType ?? 'policy',
      content: parsed.data.content,
      metadata: { uploadedVia: 'web' },
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
