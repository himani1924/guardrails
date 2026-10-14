/**
 * Result of the image-extraction step for one campaign image in one analysis
 * run. A failed extraction is kept (status "failed" + error) so the UI and
 * the risk aggregator can surface it instead of silently skipping the image.
 */
export const IMAGE_EXTRACTION_STATUSES = ['completed', 'failed'] as const;
export type ImageExtractionStatus = (typeof IMAGE_EXTRACTION_STATUSES)[number];

export interface DetectedImageElements {
  people: string[];
  products: string[];
  logos: string[];
  textOverlays: string[];
  claims: string[];
  badges: string[];
}

export interface ImageExtraction {
  id: string;
  analysisRunId: string;
  /** campaign_assets.id; undefined if the asset was later removed. */
  assetId?: string;
  /** 1-based position among the campaign's images ("image N"). */
  imageIndex: number;
  title?: string;
  mimeType?: string;
  status: ImageExtractionStatus;
  extractedText: string;
  description: string;
  detectedElements: DetectedImageElements;
  possibleConcerns: string[];
  error?: string;
  model?: string;
  createdAt: string;
}
