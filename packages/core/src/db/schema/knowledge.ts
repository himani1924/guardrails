import {
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import type { KnowledgeSourceType } from '../../types/enums';
import { knowledgeSourceTypeEnum } from './enums';

/**
 * Curated knowledge base for the MVP.
 *
 * pgvector is deliberately NOT required for the MVP — chunk embeddings are
 * stored as `double precision[]` and cosine similarity is computed in
 * application code. This keeps setup portable across Windows/Linux/macOS
 * without an extension. A production migration can flip this to
 * `vector(dim)` in a single ALTER TABLE.
 */
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
    embedding: doublePrecision('embedding').array(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('knowledge_chunks_document_id_idx').on(t.documentId)],
);

export type KnowledgeDocumentRow = typeof knowledgeDocuments.$inferSelect;
export type NewKnowledgeDocumentRow = typeof knowledgeDocuments.$inferInsert;
export type KnowledgeChunkRow = typeof knowledgeChunks.$inferSelect;
export type NewKnowledgeChunkRow = typeof knowledgeChunks.$inferInsert;

export type { KnowledgeSourceType };
