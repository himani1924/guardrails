import { getEmbeddingProvider } from '../ai';
import { getLogger } from '../logging';
import type { KnowledgeSourceType } from '../types/enums';

import { chunkMarkdown } from './chunker';
import { replaceChunks, upsertDocument } from './repository';

const log = getLogger({ component: 'knowledge.ingest' });

export interface IngestDocumentInput {
  title: string;
  sourceType: KnowledgeSourceType;
  category?: string;
  geography?: string;
  effectiveDate?: string;
  version?: string;
  documentType?: string;
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Ingest a single document: upsert the record then chunk + embed + persist.
 * The embedding provider is chosen by env (`mock` by default) so ingestion
 * works offline.
 */
export async function ingestDocument(doc: IngestDocumentInput): Promise<string> {
  const inserted = await upsertDocument({
    title: doc.title,
    sourceType: doc.sourceType,
    category: doc.category,
    geography: doc.geography,
    effectiveDate: doc.effectiveDate,
    version: doc.version,
    documentType: doc.documentType,
    content: doc.content,
    metadata: doc.metadata,
  });

  const pieces = chunkMarkdown(doc.content);
  const embedder = getEmbeddingProvider();
  const { vectors } = await embedder.embed({ texts: pieces });

  await replaceChunks(
    inserted.id,
    pieces.map((content, i) => ({
      ordinal: i,
      content,
      tokenCount: Math.ceil(content.length / 4),
      embedding: vectors[i],
      metadata: { chunkOf: doc.title },
    })),
  );

  log.info(
    { documentId: inserted.id, title: doc.title, chunks: pieces.length },
    'document_ingested',
  );
  return inserted.id;
}
