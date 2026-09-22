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
import { findings } from './findings';
import { humanReviews } from './human-review';
import { recommendations } from './recommendations';

/**
 * Human feedback captured after a review (STEP 18). Kept purposely simple —
 * a single append-only table keyed by (campaign, finding|recommendation, action).
 */
export const feedbackEvents = pgTable(
  'feedback_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    analysisRunId: uuid('analysis_run_id').references(() => analysisRuns.id, {
      onDelete: 'set null',
    }),
    findingId: uuid('finding_id').references(() => findings.id, { onDelete: 'set null' }),
    recommendationId: uuid('recommendation_id').references(() => recommendations.id, {
      onDelete: 'set null',
    }),
    humanReviewId: uuid('human_review_id').references(() => humanReviews.id, {
      onDelete: 'set null',
    }),
    action: varchar('action', { length: 60 }).notNull(),
    reviewerId: varchar('reviewer_id', { length: 100 }).notNull(),
    reviewerName: varchar('reviewer_name', { length: 200 }),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
    comments: text('comments'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('feedback_events_campaign_id_idx').on(t.campaignId),
    index('feedback_events_action_idx').on(t.action),
    index('feedback_events_finding_id_idx').on(t.findingId),
  ],
);

export type FeedbackEventRow = typeof feedbackEvents.$inferSelect;
export type NewFeedbackEventRow = typeof feedbackEvents.$inferInsert;
