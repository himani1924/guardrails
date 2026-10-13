import { and, cosineDistance, eq, inArray, isNotNull, isNull, or, sql, type SQL } from 'drizzle-orm';

import { getEmbeddingProvider } from '../ai';
import { getDb } from '../db/client';
import { knowledgeChunks, knowledgeDocuments } from '../db/schema';
import { getLogger } from '../logging';
import type { KnowledgeSourceType } from '../types/enums';

import { assertEmbeddingDimension, embeddingModelId } from './vector';

const log = getLogger({ component: 'knowledge.retriever' });

export interface RetrievalFilter {
  sourceType?: KnowledgeSourceType[];
  geography?: string;
  category?: string;
}

export interface RetrievalQuery {
  query: string;
  topK?: number;
  filter?: RetrievalFilter;
}

export interface RetrievedChunk {
  documentId: string;
  documentTitle: string;
  sourceType: KnowledgeSourceType;
  chunkId: string;
  ordinal: number;
  content: string;
  /** Cosine similarity (1 - pgvector cosine distance). */
  score: number;
  geography?: string;
  category?: string;
}

/**
 * Builds the WHERE clause. Semantics match the previous in-memory filter:
 * documents with a NULL geography/category count as matching any value.
 * Only chunks embedded by the active embedding model are compared.
 */
export function buildRetrievalWhere(filter: RetrievalFilter | undefined, model: string): SQL {
  const conds: SQL[] = [
    isNotNull(knowledgeChunks.embedding),
    eq(knowledgeChunks.embeddingModel, model),
  ];
  if (filter?.sourceType?.length) {
    conds.push(inArray(knowledgeDocuments.sourceType, filter.sourceType));
  }
  if (filter?.geography) {
    conds.push(
      or(isNull(knowledgeDocuments.geography), eq(knowledgeDocuments.geography, filter.geography))!,
    );
  }
  if (filter?.category) {
    conds.push(
      or(isNull(knowledgeDocuments.category), eq(knowledgeDocuments.category, filter.category))!,
    );
  }
  return and(...conds)!;
}

/** Top-k semantic search in Postgres via pgvector (`<=>`, HNSW cosine index). */
export async function retrieve(query: RetrievalQuery): Promise<RetrievedChunk[]> {
  const topK = query.topK ?? 4;
  const embedder = getEmbeddingProvider();
  const { vectors, model } = await embedder.embed({ texts: [query.query] });
  const q = assertEmbeddingDimension(vectors[0]);
  const modelId = embeddingModelId(embedder, model);

  const distance = cosineDistance(knowledgeChunks.embedding, q);
  const rows = await getDb()
    .select({
      documentId: knowledgeDocuments.id,
      documentTitle: knowledgeDocuments.title,
      sourceType: knowledgeDocuments.sourceType,
      chunkId: knowledgeChunks.id,
      ordinal: knowledgeChunks.ordinal,
      content: knowledgeChunks.content,
      score: sql<number>`1 - (${distance})`.mapWith(Number),
      geography: knowledgeDocuments.geography,
      category: knowledgeDocuments.category,
    })
    .from(knowledgeChunks)
    .innerJoin(knowledgeDocuments, eq(knowledgeChunks.documentId, knowledgeDocuments.id))
    .where(buildRetrievalWhere(query.filter, modelId))
    .orderBy(distance)
    .limit(topK);

  if (rows.length === 0) {
    log.warn({ embeddingModel: modelId }, 'knowledge_base_empty_or_not_embedded_for_model');
  }

  return rows.map((r) => ({
    ...r,
    geography: r.geography ?? undefined,
    category: r.category ?? undefined,
  }));
}
