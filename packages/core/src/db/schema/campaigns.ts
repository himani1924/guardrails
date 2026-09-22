import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import type { FestivalContext, Geography } from '../../types/campaign';
import {
  assetTypeEnum,
  campaignStatusEnum,
  campaignTypeEnum,
  platformEnum,
} from './enums';

/**
 * Root campaign record. Denormalised policy context / festival context are
 * kept as jsonb because their shape is inherently variable and they are only
 * ever read together with the parent row.
 */
export const campaigns = pgTable(
  'campaigns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 200 }).notNull(),
    copy: text('copy').notNull(),
    campaignType: campaignTypeEnum('campaign_type').notNull(),
    platform: platformEnum('platform').notNull(),
    geography: jsonb('geography').$type<Geography>().notNull(),
    festivalContext: jsonb('festival_context').$type<FestivalContext>(),
    applicablePolicyContext: jsonb('applicable_policy_context')
      .$type<string[]>()
      .notNull()
      .default([]),
    status: campaignStatusEnum('status').notNull().default('draft'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('campaigns_status_idx').on(t.status),
    index('campaigns_created_at_idx').on(t.createdAt),
  ],
);

export const campaignAssets = pgTable(
  'campaign_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    type: assetTypeEnum('type').notNull(),
    title: varchar('title', { length: 200 }),
    description: text('description'),
    url: text('url'),
    storagePath: text('storage_path'),
    mimeType: varchar('mime_type', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('campaign_assets_campaign_id_idx').on(t.campaignId)],
);

export type CampaignRow = typeof campaigns.$inferSelect;
export type NewCampaignRow = typeof campaigns.$inferInsert;
export type CampaignAssetRow = typeof campaignAssets.$inferSelect;
export type NewCampaignAssetRow = typeof campaignAssets.$inferInsert;
