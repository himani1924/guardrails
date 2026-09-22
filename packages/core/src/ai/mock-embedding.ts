import { createHash } from 'node:crypto';

import { getLogger } from '../logging';

import type {
  EmbeddingProvider,
  EmbeddingRequest,
  EmbeddingResponse,
} from './types';

const log = getLogger({ component: 'ai.embedding.mock' });

/**
 * Deterministic mock embedding. Uses a hash of the text to seed a fixed-length
 * vector so cosine similarity between identical texts is 1, and completely
 * different texts have low similarity. Not a real semantic embedding — but
 * good enough to exercise retrieval code paths without a network call.
 */
export class MockEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'mock';
  readonly dimension: number;

  constructor(dimension = 384) {
    this.dimension = dimension;
  }

  async embed(req: EmbeddingRequest): Promise<EmbeddingResponse> {
    const vectors = req.texts.map((t) => hashToVector(t, this.dimension));
    log.debug({ count: req.texts.length, dim: this.dimension }, 'mock_embed');
    return {
      vectors,
      model: 'mock',
      promptTokens: req.texts.reduce((s, t) => s + Math.ceil(t.length / 4), 0),
      latencyMs: 0,
    };
  }
}

function hashToVector(text: string, dim: number): number[] {
  const norm = text.trim().toLowerCase();
  const out = new Array<number>(dim).fill(0);
  // Fill with pseudo-random values seeded by SHA-256 of the input.
  const rounds = Math.ceil((dim * 4) / 32);
  const buf = Buffer.concat(
    Array.from({ length: rounds }, (_, i) =>
      createHash('sha256').update(`${i}:${norm}`).digest(),
    ),
  );
  for (let i = 0; i < dim; i++) {
    const v = buf.readInt32LE(i * 4);
    out[i] = v / 0x7fffffff;
  }
  // L2-normalise so cosine similarity is dot product.
  let mag = 0;
  for (const v of out) mag += v * v;
  mag = Math.sqrt(mag) || 1;
  return out.map((v) => v / mag);
}
