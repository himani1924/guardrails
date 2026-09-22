import { eq } from 'drizzle-orm';

import { getDb } from '../db/client';
import { audienceSegments } from '../db/schema';
import { NotFoundError } from '../errors';
import type { AudienceSegment } from '../types/audience';

function toAudienceSegment(row: typeof audienceSegments.$inferSelect): AudienceSegment {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listAudienceSegments(): Promise<AudienceSegment[]> {
  const db = getDb();
  const rows = await db.select().from(audienceSegments).orderBy(audienceSegments.name);
  return rows.map(toAudienceSegment);
}

export async function getAudienceSegmentByKey(key: string): Promise<AudienceSegment> {
  const db = getDb();
  const row = await db.query.audienceSegments.findFirst({
    where: eq(audienceSegments.key, key),
  });
  if (!row) throw new NotFoundError('Audience segment not found', { key });
  return toAudienceSegment(row);
}
