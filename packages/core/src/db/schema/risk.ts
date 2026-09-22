import {
  boolean,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { analysisRuns } from './analyses';
import { riskDimensionEnum, riskLevelEnum } from './enums';

/**
 * One row per (run × dimension). Unique index keeps the aggregator honest:
 * a single run can never publish two conflicting values for the same
 * dimension.
 */
export const riskAssessments = pgTable(
  'risk_assessments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    analysisRunId: uuid('analysis_run_id')
      .notNull()
      .references(() => analysisRuns.id, { onDelete: 'cascade' }),
    dimension: riskDimensionEnum('dimension').notNull(),
    level: riskLevelEnum('level').notNull(),
    reasons: jsonb('reasons').$type<string[]>().notNull(),
    supportingFindingIds: jsonb('supporting_finding_ids')
      .$type<string[]>()
      .notNull()
      .default([]),
    confidence: numeric('confidence', { precision: 4, scale: 3 }).notNull(),
    uncertainty: text('uncertainty'),
    humanReviewRequired: boolean('human_review_required').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('risk_assessments_analysis_run_id_idx').on(t.analysisRunId),
    uniqueIndex('risk_assessments_run_dim_uniq').on(t.analysisRunId, t.dimension),
  ],
);

export type RiskAssessmentRow = typeof riskAssessments.$inferSelect;
export type NewRiskAssessmentRow = typeof riskAssessments.$inferInsert;
