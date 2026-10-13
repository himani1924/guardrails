import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  vector,
} from 'drizzle-orm/pg-core';

import type { KnowledgeSourceType } from '../../types/enums';
import { knowledgeSourceTypeEnum } from './enums';

/**
 * Curated knowledge base for the MVP.
 *
 * Chunk embeddings live in a pgvector `vector(N)` column with an HNSW
 * cosine index, and top-k retrieval runs in SQL (`<=>`). N is fixed by the
 * migration, so every embedding provider is asked for the same output size
 * (`EMBEDDING_DIMENSION`, default 768). To change N: update
 * KNOWLEDGE_EMBEDDING_DIMENSION, run `npm run db:generate`, migrate, then
 * `npm run db:reembed`.
 */
export const KNOWLEDGE_EMBEDDING_DIMENSION = 768;

export const knowledgeDocuments = pgTable(
  'knowledge_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 300 }).notNull(),
    sourceType: knowledgeSourceTypeEnum('source_type').notNull(),
    category: varchar('category', { length: 100 }),
    geography: varchar('geography', { length: 10 }),
    effectiveDate: varchar('effective_date', { length: 20 }),
    version: varchar('version', { length: 40 }),
    documentType: varchar('document_type', { length: 100 }),
    content: text('content').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('knowledge_documents_source_type_idx').on(t.sourceType),
    index('knowledge_documents_geography_idx').on(t.geography),
  ],
);

export const knowledgeChunks = pgTable(
  'knowledge_chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => knowledgeDocuments.id, { onDelete: 'cascade' }),
    ordinal: integer('ordinal').notNull(),
    content: text('content').notNull(),
    tokenCount: integer('token_count'),
    embedding: vector('embedding', { dimensions: KNOWLEDGE_EMBEDDING_DIMENSION }),
    /** `<provider>:<model>` that produced `embedding`; retrieval only compares like with like. */
    embeddingModel: varchar('embedding_model', { length: 150 }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('knowledge_chunks_document_id_idx').on(t.documentId),
    index('knowledge_chunks_embedding_hnsw_idx').using(
      'hnsw',
      t.embedding.op('vector_cosine_ops'),
    ),
  ],
);

export type KnowledgeDocumentRow = typeof knowledgeDocuments.$inferSelect;
export type NewKnowledgeDocumentRow = typeof knowledgeDocuments.$inferInsert;
export type KnowledgeChunkRow = typeof knowledgeChunks.$inferSelect;
export type NewKnowledgeChunkRow = typeof knowledgeChunks.$inferInsert;

export type { KnowledgeSourceType };
