import {
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
import { audienceSegments } from './audience';

/**
 * One row per simulated audience perspective for an analysis run (STEP 12).
 */
export const audiencePerspectiveResults = pgTable(
  'audience_perspective_results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    analysisRunId: uuid('analysis_run_id')
      .notNull()
      .references(() => analysisRuns.id, { onDelete: 'cascade' }),
    audienceSegmentId: uuid('audience_segment_id')
      .notNull()
      .references(() => audienceSegments.id, { onDelete: 'restrict' }),
    audienceSegmentKey: varchar('audience_segment_key', { length: 100 }).notNull(),
    possibleInterpretation: text('possible_interpretation').notNull(),
    positiveSignals: jsonb('positive_signals').$type<string[]>().notNull(),
    concernSignals: jsonb('concern_signals').$type<string[]>().notNull(),
    ambiguity: text('ambiguity'),
    potentialSensitivity: text('potential_sensitivity'),
    confidence: numeric('confidence', { precision: 4, scale: 3 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('audience_perspective_results_analysis_run_id_idx').on(t.analysisRunId),
    index('audience_perspective_results_segment_id_idx').on(t.audienceSegmentId),
  ],
);

export type AudiencePerspectiveResultRow =
  typeof audiencePerspectiveResults.$inferSelect;
export type NewAudiencePerspectiveResultRow =
  typeof audiencePerspectiveResults.$inferInsert;
