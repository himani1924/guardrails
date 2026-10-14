import type { ImageExtraction } from './image';
import type {
  AssetType,
  CampaignStatus,
  CampaignType,
  Platform,
} from './enums';

/**
 * Geography attached to a campaign. Kept as a small struct so it can carry a
 * region (state / market) alongside the country code without introducing a
 * dedicated table for the MVP.
 */
export interface Geography {
  country: string;
  region?: string;
}

export interface FestivalContext {
  key: string;
  name: string;
  date?: string;
  description?: string;
}

export interface CampaignAsset {
  id: string;
  campaignId: string;
  type: AssetType;
  title?: string;
  description?: string;
  url?: string;
  storagePath?: string;
  mimeType?: string;
  /** Size of the stored image bytes (image assets uploaded through the form). */
  byteSize?: number;
  /** True when binary image data is stored for this asset. */
  hasFile?: boolean;
  sortOrder?: number;
  createdAt: string;
}

/**
 * A campaign as authored by the marketing user. This is the write-side shape
 * — the analysis pipeline consumes `CampaignContext` derived from this.
 */
export interface Campaign {
  id: string;
  name: string;
  copy: string;
  campaignType: CampaignType;
  platform: Platform;
  geography: Geography;
  audienceSegmentIds: string[];
  festivalContext?: FestivalContext;
  assets: CampaignAsset[];
  applicablePolicyContext: string[];
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Everything the agents need to reason about a campaign. Built by the
 * orchestrator from a `Campaign` plus resolved audience segments and any
 * applicable policy context references.
 */
export interface CampaignContext {
  campaignId: string;
  name: string;
  copy: string;
  campaignType: CampaignType;
  platform: Platform;
  geography: Geography;
  festivalContext?: FestivalContext;
  audienceSegmentKeys: string[];
  assets: CampaignAsset[];
  applicablePolicyContext: string[];
  /** Per-image OCR + description from the image-extraction step (if any). */
  images?: ImageExtraction[];
  /**
   * Copy plus the OCR text of every image. Rules that check for the ABSENCE of
   * something (disclaimers, #ad, responsible-celebration line) read this so a
   * marker in either the copy or an image satisfies them.
   */
  combinedText?: string;
}
