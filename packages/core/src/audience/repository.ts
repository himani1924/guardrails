import { getDb } from '../db/client';
import { audienceSegments } from '../db/schema';
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
