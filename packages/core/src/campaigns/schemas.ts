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

/** Image upload limits (shared by the form, the API and the analysis step). */
export const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_IMAGES_PER_CAMPAIGN = 6;
const MAX_IMAGE_BASE64_CHARS = Math.ceil(MAX_IMAGE_BYTES / 3) * 4;

export const campaignAssetInputSchema = z.object({
  /** Existing asset id (edit form): keeps the row and its stored bytes. */
  id: z.string().uuid().optional(),
  type: z.enum(ASSET_TYPES),
  title: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  url: z.string().url().optional(),
  storagePath: z.string().max(500).optional(),
  mimeType: z.string().max(100).optional(),
  /** New image upload: base64 bytes (no data: prefix). Requires type 'image'. */
  dataBase64: z
    .string()
    .max(MAX_IMAGE_BASE64_CHARS, 'Image is larger than 4 MB')
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, 'Image data must be base64')
    .optional(),
}).superRefine((a, ctx) => {
  if (a.dataBase64 === undefined) return;
  if (a.type !== 'image') {
    ctx.addIssue({ code: 'custom', message: 'Only image assets can carry file data', path: ['type'] });
  }
  if (!a.mimeType || !(IMAGE_MIME_TYPES as readonly string[]).includes(a.mimeType)) {
    ctx.addIssue({ code: 'custom', message: 'Images must be PNG, JPEG or WebP', path: ['mimeType'] });
  }
});

const assetsSchema = z
  .array(campaignAssetInputSchema)
  .max(20)
  .refine((list) => list.filter((a) => a.type === 'image').length <= MAX_IMAGES_PER_CAMPAIGN, {
    message: `At most ${MAX_IMAGES_PER_CAMPAIGN} images per campaign`,
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
  assets: assetsSchema.default([]),
});

export const updateCampaignSchema = createCampaignSchema
  .extend({
    status: z.enum(CAMPAIGN_STATUSES).optional(),
  })
  .partial();

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type CampaignAssetInput = z.infer<typeof campaignAssetInputSchema>;
