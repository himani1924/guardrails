import { getEmbeddingProvider } from '../ai';
import { getLogger } from '../logging';
import type { KnowledgeSourceType } from '../types/enums';

import { loadAllChunks } from './repository';

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
  score: number;
  geography?: string;
  category?: string;
}

export async function retrieve(query: RetrievalQuery): Promise<RetrievedChunk[]> {
  const topK = query.topK ?? 4;
  const { chunks, docsById } = await loadAllChunks();
  if (chunks.length === 0) {
    log.warn('knowledge_base_empty');
    return [];
  }

  const embedder = getEmbeddingProvider();
  const { vectors } = await embedder.embed({ texts: [query.query] });
  const q = vectors[0];
  if (!q) return [];

  const filtered = chunks
    .map((c) => {
      const doc = docsById.get(c.documentId);
      if (!doc) return undefined;
      if (query.filter?.sourceType && !query.filter.sourceType.includes(doc.sourceType))
        return undefined;
      if (query.filter?.geography && doc.geography && doc.geography !== query.filter.geography)
        return undefined;
      if (query.filter?.category && doc.category && doc.category !== query.filter.category)
        return undefined;
      return { chunk: c, doc };
    })
    .filter((x): x is { chunk: (typeof chunks)[number]; doc: NonNullable<ReturnType<typeof docsById.get>> } => Boolean(x));

  const scored: RetrievedChunk[] = [];
  for (const { chunk, doc } of filtered) {
    const emb = chunk.embedding;
    if (!emb || emb.length === 0) continue;
    const score = cosine(q, emb);
    scored.push({
      documentId: doc.id,
      documentTitle: doc.title,
      sourceType: doc.sourceType,
      chunkId: chunk.id,
      ordinal: chunk.ordinal,
      content: chunk.content,
      score,
      geography: doc.geography ?? undefined,
      category: doc.category ?? undefined,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < n; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    magA += ai * ai;
    magB += bi * bi;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}
