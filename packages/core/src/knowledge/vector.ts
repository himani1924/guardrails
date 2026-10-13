import { KNOWLEDGE_EMBEDDING_DIMENSION } from '../db/schema/knowledge';
import type { EmbeddingProvider } from '../ai/types';

/** Identifier stored in `knowledge_chunks.embedding_model`. */
export function embeddingModelId(provider: Pick<EmbeddingProvider, 'name'>, model: string): string {
  return `${provider.name}:${model}`;
}

/**
 * Guards the pgvector column: Postgres would reject a wrong-sized vector
 * anyway, but this fails earlier with an actionable message.
 */
export function assertEmbeddingDimension(
  vector: number[] | undefined,
  expected: number = KNOWLEDGE_EMBEDDING_DIMENSION,
): number[] {
  if (!vector || vector.length !== expected) {
    throw new Error(
      `Embedding has ${vector?.length ?? 0} dimensions but knowledge_chunks.embedding is vector(${expected}). ` +
        'Set EMBEDDING_DIMENSION to match (default 768), or change KNOWLEDGE_EMBEDDING_DIMENSION and generate a migration.',
    );
  }
  return vector;
}
