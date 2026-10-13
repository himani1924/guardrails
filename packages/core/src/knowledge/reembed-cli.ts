import { getEmbeddingProvider } from '../ai';
import { closeDb } from '../db/client';
import { getLogger } from '../logging';

import { listChunksForReembed, updateChunkEmbedding } from './repository';
import { assertEmbeddingDimension, embeddingModelId } from './vector';

const log = getLogger({ component: 'knowledge.reembed-cli' });
const BATCH = 32;

/**
 * Backfill: re-embeds every existing chunk with the active embedding provider
 * and writes it to the pgvector column. Run after `db:migrate` on a database
 * that had chunks before pgvector, or after switching EMBEDDING_PROVIDER.
 * Does not duplicate documents (unlike re-running `db:ingest`).
 */
async function main(): Promise<void> {
  const embedder = getEmbeddingProvider();
  const chunks = await listChunksForReembed();
  log.info({ count: chunks.length, provider: embedder.name }, 'reembed_start');
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const { vectors, model } = await embedder.embed({ texts: batch.map((c) => c.content) });
    const modelId = embeddingModelId(embedder, model);
    for (const [j, c] of batch.entries()) {
      await updateChunkEmbedding(c.id, assertEmbeddingDimension(vectors[j]), modelId);
    }
    log.info({ done: Math.min(i + BATCH, chunks.length), total: chunks.length }, 'reembed_progress');
  }
  log.info('reembed_complete');
}

const isEntrypoint =
  import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` ||
  import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`;

if (isEntrypoint) {
  main()
    .then(async () => {
      await closeDb();
      process.exit(0);
    })
    .catch(async (err: unknown) => {
      log.error({ err }, 'reembed_failed');
      await closeDb();
      process.exit(1);
    });
}
