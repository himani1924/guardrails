import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { campaigns } from './campaigns';
import { analysisRunStatusEnum } from './enums';

/**
 * One row per analysis attempt on a campaign. Findings, risks and
 * recommendations reference the run so re-analysis produces a fresh set
 * without discarding history.
 */
export const analysisRuns = pgTable(
  'analysis_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    status: analysisRunStatusEnum('status').notNull().default('queued'),
    provider: varchar('provider', { length: 50 }),
    model: varchar('model', { length: 100 }),
    requestedBy: varchar('requested_by', { length: 100 }),
    totalPromptTokens: integer('total_prompt_tokens'),
    totalCompletionTokens: integer('total_completion_tokens'),
    totalCostUsd: numeric('total_cost_usd', { precision: 12, scale: 6 }),
    latencyMs: integer('latency_ms'),
    error: text('error'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('analysis_runs_campaign_id_idx').on(t.campaignId),
    index('analysis_runs_status_idx').on(t.status),
    index('analysis_runs_started_at_idx').on(t.startedAt),
  ],
);

export type AnalysisRunRow = typeof analysisRuns.$inferSelect;
export type NewAnalysisRunRow = typeof analysisRuns.$inferInsert;
