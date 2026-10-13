import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import { MockEmbeddingProvider } from '../ai/mock-embedding';
import { buildRetrievalWhere } from './retriever';
import { assertEmbeddingDimension, embeddingModelId } from './vector';

const dialect = new PgDialect();

describe('pgvector retrieval helpers', () => {
  it('mock embedder produces vectors matching the vector(768) column', async () => {
    const { vectors } = await new MockEmbeddingProvider(768).embed({ texts: ['hello'] });
    expect(assertEmbeddingDimension(vectors[0])).toHaveLength(768);
  });

  it('rejects wrong-sized embeddings with an actionable error', () => {
    expect(() => assertEmbeddingDimension(new Array(384).fill(0))).toThrow(/vector\(768\)/);
    expect(() => assertEmbeddingDimension(undefined)).toThrow(/0 dimensions/);
  });

  it('builds a provider-scoped model id', () => {
    expect(embeddingModelId({ name: 'gemini' }, 'gemini-embedding-001')).toBe(
      'gemini:gemini-embedding-001',
    );
  });

  it('always restricts to embedded chunks of the active model', () => {
    const q = dialect.sqlToQuery(buildRetrievalWhere(undefined, 'mock:mock'));
    expect(q.sql).toContain('"knowledge_chunks"."embedding" is not null');
    expect(q.sql).toContain('"knowledge_chunks"."embedding_model" = $1');
    expect(q.params).toEqual(['mock:mock']);
  });

  it('applies sourceType filter and null-tolerant geography/category filters', () => {
    const q = dialect.sqlToQuery(
      buildRetrievalWhere(
        { sourceType: ['internal_policy', 'approved_claim'], geography: 'IN', category: 'x' },
        'mock:mock',
      ),
    );
    expect(q.sql).toContain('"knowledge_documents"."source_type" in ($2, $3)');
    expect(q.sql).toContain(
      '("knowledge_documents"."geography" is null or "knowledge_documents"."geography" = $4)',
    );
    expect(q.sql).toContain(
      '("knowledge_documents"."category" is null or "knowledge_documents"."category" = $5)',
    );
    expect(q.params).toEqual(['mock:mock', 'internal_policy', 'approved_claim', 'IN', 'x']);
  });
});
