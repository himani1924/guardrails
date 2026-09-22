import { z } from 'zod';

import {
  ASSET_TYPES,
  CAMPAIGN_STATUSES,
  CAMPAIGN_TYPES,
  PLATFORMS,
} from '../types/enums';

/** Zod schemas mirroring the domain types. Kept in the core package so the
 * frontend, API routes and tests share the exact same validation logic. */

export const geographySchema = z.object({
  country: z.string().min(2).max(3),
  region: z.string().min(1).max(100).optional(),
});

export const festivalContextSchema = z.object({
  key: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  date: z.string().optional(),
  description: z.string().max(2000).optional(),
});

export const campaignAssetInputSchema = z.object({
  type: z.enum(ASSET_TYPES),
  title: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  url: z.string().url().optional(),
  storagePath: z.string().max(500).optional(),
  mimeType: z.string().max(100).optional(),
});

export const createCampaignSchema = z.object({
  name: z.string().min(3).max(200),
  copy: z.string().min(1).max(10_000),
  campaignType: z.enum(CAMPAIGN_TYPES),
  platform: z.enum(PLATFORMS),
  geography: geographySchema,
  festivalContext: festivalContextSchema.optional(),
  applicablePolicyContext: z.array(z.string().min(1).max(200)).max(20).default([]),
  audienceSegmentKeys: z.array(z.string().min(1).max(100)).min(1).max(20),
  assets: z.array(campaignAssetInputSchema).max(20).default([]),
});

export const updateCampaignSchema = createCampaignSchema
  .extend({
    status: z.enum(CAMPAIGN_STATUSES).optional(),
  })
  .partial();

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type CampaignAssetInput = z.infer<typeof campaignAssetInputSchema>;
