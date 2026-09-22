import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { campaigns } from './campaigns';

/**
 * Configured audience personas used by the Audience Perspective Simulation.
 * Deliberately a small controlled set — not user-uploaded — because these
 * shape the agents' framing.
 */
export const audienceSegments = pgTable('audience_segments', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Many-to-many between campaigns and audience segments. `onDelete: restrict`
 * on the segment side so we don't lose historical audit context if a segment
 * definition is retired.
 */
export const campaignAudienceSegments = pgTable(
  'campaign_audience_segments',
  {
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    audienceSegmentId: uuid('audience_segment_id')
      .notNull()
      .references(() => audienceSegments.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.campaignId, t.audienceSegmentId] }),
    index('campaign_audience_segments_segment_idx').on(t.audienceSegmentId),
  ],
);

export type AudienceSegmentRow = typeof audienceSegments.$inferSelect;
export type NewAudienceSegmentRow = typeof audienceSegments.$inferInsert;
export type CampaignAudienceSegmentRow = typeof campaignAudienceSegments.$inferSelect;
export type NewCampaignAudienceSegmentRow = typeof campaignAudienceSegments.$inferInsert;
