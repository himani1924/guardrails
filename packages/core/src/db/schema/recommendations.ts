import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { analysisRuns } from './analyses';
import { findings } from './findings';
import { recommendationActionEnum, recommendationStatusEnum } from './enums';

/**
 * A suggested action tied to a specific finding. The `findingId` FK
 * enforces the "no free-floating recommendations" rule from
 * `PROJECT_CONTEXT.md`.
 */
export const recommendations = pgTable(
  'recommendations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    analysisRunId: uuid('analysis_run_id')
      .notNull()
      .references(() => analysisRuns.id, { onDelete: 'cascade' }),
    findingId: uuid('finding_id')
      .notNull()
      .references(() => findings.id, { onDelete: 'cascade' }),
    action: recommendationActionEnum('action').notNull(),
    originalContent: text('original_content'),
    suggestedModification: text('suggested_modification'),
    reason: text('reason').notNull(),
    confidence: numeric('confidence', { precision: 4, scale: 3 }).notNull(),
    status: recommendationStatusEnum('status').notNull().default('proposed'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('recommendations_analysis_run_id_idx').on(t.analysisRunId),
    index('recommendations_finding_id_idx').on(t.findingId),
  ],
);

export type RecommendationRow = typeof recommendations.$inferSelect;
export type NewRecommendationRow = typeof recommendations.$inferInsert;
