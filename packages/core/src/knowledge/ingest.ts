import { getEmbeddingProvider } from '../ai';
import { getLogger } from '../logging';
import type { KnowledgeSourceType } from '../types/enums';

import { chunkMarkdown } from './chunker';
import { findDocumentsByTitle, replaceChunks, updateDocument, upsertDocument } from './repository';
import { assertEmbeddingDimension, embeddingModelId } from './vector';

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

export type IngestStatus = 'created' | 'updated' | 'unchanged';
export interface IngestResult {
  id: string;
  status: IngestStatus;
}

/** Ingest a document and return its id (see ingestDocumentWithStatus). */
export async function ingestDocument(doc: IngestDocumentInput): Promise<string> {
  return (await ingestDocumentWithStatus(doc)).id;
}

/**
 * Ingest a single document, de-duplicated by title + source type:
 *  - same title + type and identical content → metadata refreshed, no new
 *    row, no re-embedding ("unchanged");
 *  - same title + type, different content → the newest matching row is
 *    replaced and re-chunked ("updated");
 *  - otherwise a new document is inserted ("created").
 * So re-running `db:ingest` or re-uploading a file no longer creates copies.
 * The embedding provider is chosen by env (`mock` by default).
 */
export async function ingestDocumentWithStatus(doc: IngestDocumentInput): Promise<IngestResult> {
  const title = doc.title.trim();
  const fields = {
    title,
    sourceType: doc.sourceType,
    category: doc.category,
    geography: doc.geography,
    effectiveDate: doc.effectiveDate,
    version: doc.version,
    documentType: doc.documentType,
    content: doc.content,
    metadata: doc.metadata,
  };
  const existing = await findDocumentsByTitle(title, doc.sourceType, doc.content);
  const identical = existing.find((e) => e.sameContent);
  if (identical) {
    const { content: _content, ...meta } = fields;
    await updateDocument(identical.id, meta);
    log.info({ documentId: identical.id, title }, 'document_unchanged_skipped');
    return { id: identical.id, status: 'unchanged' };
  }

  let status: IngestStatus = 'created';
  let inserted: { id: string };
  if (existing[0]) {
    await updateDocument(existing[0].id, fields);
    inserted = { id: existing[0].id };
    status = 'updated';
  } else {
    inserted = await upsertDocument(fields);
  }

  const pieces = chunkMarkdown(doc.content);
  const embedder = getEmbeddingProvider();
  const { vectors, model } = await embedder.embed({ texts: pieces });
  const embeddingModel = embeddingModelId(embedder, model);

  await replaceChunks(
    inserted.id,
    pieces.map((content, i) => ({
      ordinal: i,
      content,
      tokenCount: Math.ceil(content.length / 4),
      embedding: assertEmbeddingDimension(vectors[i]),
      embeddingModel,
      metadata: { chunkOf: doc.title },
    })),
  );

  log.info(
    { documentId: inserted.id, title: doc.title, chunks: pieces.length },
    `document_${status}`,
  );
  return { id: inserted.id, status };
}
