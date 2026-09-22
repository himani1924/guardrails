import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { analysisRuns } from './analyses';
import { campaigns } from './campaigns';
import { humanReviewStatusEnum } from './enums';

/**
 * A reviewer's inspection of a campaign. `analysisRunId` is nullable so a
 * reviewer can inspect a campaign that has never been analysed (edge case,
 * but cheaper than a separate table).
 */
export const humanReviews = pgTable(
  'human_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    analysisRunId: uuid('analysis_run_id').references(() => analysisRuns.id, {
      onDelete: 'set null',
    }),
    reviewerId: varchar('reviewer_id', { length: 100 }).notNull(),
    reviewerName: varchar('reviewer_name', { length: 200 }),
    status: humanReviewStatusEnum('status').notNull().default('pending'),
    decision: text('decision'),
    comments: text('comments'),
    overrides: jsonb('overrides').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (t) => [
    index('human_reviews_campaign_id_idx').on(t.campaignId),
    index('human_reviews_status_idx').on(t.status),
    index('human_reviews_reviewer_id_idx').on(t.reviewerId),
  ],
);

export type HumanReviewRow = typeof humanReviews.$inferSelect;
export type NewHumanReviewRow = typeof humanReviews.$inferInsert;
