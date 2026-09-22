import {
  boolean,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { analysisRuns } from './analyses';
import {
  agentKindEnum,
  evidenceStatusEnum,
  findingCategoryEnum,
  knowledgeSourceTypeEnum,
  severityEnum,
} from './enums';

/**
 * A single risk signal on an analysis run. Uniform across every producer
 * (LLM agent or rule engine) so the aggregator and UI treat them the same.
 */
export const findings = pgTable(
  'findings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    analysisRunId: uuid('analysis_run_id')
      .notNull()
      .references(() => analysisRuns.id, { onDelete: 'cascade' }),
    producedBy: agentKindEnum('produced_by').notNull(),
    category: findingCategoryEnum('category').notNull(),
    severity: severityEnum('severity').notNull(),
    title: varchar('title', { length: 300 }).notNull(),
    explanation: text('explanation').notNull(),
    affectedContent: text('affected_content'),
    confidence: numeric('confidence', { precision: 4, scale: 3 }).notNull(),
    uncertainty: text('uncertainty'),
    requiresHumanReview: boolean('requires_human_review').notNull().default(false),
    evidenceRequired: boolean('evidence_required').notNull().default(false),
    evidenceStatus: evidenceStatusEnum('evidence_status').notNull(),
    suggestedAction: text('suggested_action'),
    ruleId: varchar('rule_id', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('findings_analysis_run_id_idx').on(t.analysisRunId),
    index('findings_category_idx').on(t.category),
    index('findings_severity_idx').on(t.severity),
    index('findings_produced_by_idx').on(t.producedBy),
  ],
);

/**
 * Retrieved supporting material for a finding. Sourced only from the
 * knowledge base — the LLM never invents a citation.
 */
export const evidence = pgTable(
  'evidence',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    findingId: uuid('finding_id')
      .notNull()
      .references(() => findings.id, { onDelete: 'cascade' }),
    sourceType: knowledgeSourceTypeEnum('source_type').notNull(),
    sourceTitle: varchar('source_title', { length: 300 }).notNull(),
    sourceDocumentId: varchar('source_document_id', { length: 100 }).notNull(),
    chunkId: varchar('chunk_id', { length: 100 }),
    excerpt: text('excerpt').notNull(),
    relevanceScore: numeric('relevance_score', { precision: 4, scale: 3 }).notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('evidence_finding_id_idx').on(t.findingId)],
);

export type FindingRow = typeof findings.$inferSelect;
export type NewFindingRow = typeof findings.$inferInsert;
export type EvidenceRow = typeof evidence.$inferSelect;
export type NewEvidenceRow = typeof evidence.$inferInsert;
