import { afterAll, describe, expect, it } from 'vitest';

/**
 * End-to-end pgvector retrieval against a real, migrated Postgres.
 * Skipped unless TEST_DATABASE_URL is set, e.g.
 *   TEST_DATABASE_URL=postgres://guardrail:guardrail@localhost:5433/guardrail npm test
 * Uses the mock embedder and cleans up the documents it creates.
 */
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('pgvector retrieval (integration)', () => {
  const created: string[] = [];

  async function load() {
    process.env.DATABASE_URL = url;
    process.env.EMBEDDING_PROVIDER = 'mock';
    const [knowledge, db, schema, orm] = await Promise.all([
      import('./index'),
      import('../db/client'),
      import('../db/schema'),
      import('drizzle-orm'),
    ]);
    return { knowledge, db, schema, orm };
  }

  afterAll(async () => {
    const { db, schema, orm } = await load();
    if (created.length) {
      await db
        .getDb()
        .delete(schema.knowledgeDocuments)
        .where(orm.inArray(schema.knowledgeDocuments.id, created));
    }
    await db.closeDb();
  });

  it('returns the exact-match chunk first, ordered by cosine similarity, honouring filters', async () => {
    const { knowledge } = await load();
    const tag = `itest-${Date.now()}`;
    const text = `${tag} Promotional campaigns must include T&C apply near the offer.`;
    created.push(
      await knowledge.ingestDocument({ title: `${tag} policy`, sourceType: 'internal_policy', content: text }),
      await knowledge.ingestDocument({ title: `${tag} history`, sourceType: 'historical_campaign', content: `${tag} unrelated history` }),
    );

    const hits = await knowledge.retrieve({ query: text, topK: 6, filter: { sourceType: ['internal_policy'] } });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.content).toBe(text);
    expect(hits[0]?.score).toBeCloseTo(1, 5);
    expect(hits.every((h) => h.sourceType === 'internal_policy')).toBe(true);
    for (let i = 1; i < hits.length; i++) expect(hits[i - 1]!.score).toBeGreaterThanOrEqual(hits[i]!.score);
  });
});
