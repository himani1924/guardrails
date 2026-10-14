import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import { getLLMProvider } from '../ai';
import type { LLMProvider } from '../ai/types';
import { getLogger } from '../logging';
import type { CampaignContext } from '../types/campaign';
import type { Finding } from '../types/finding';
import type { ImageExtraction } from '../types/image';

const log = getLogger({ component: 'images.extraction' });

const list = z.array(z.string().max(300)).max(30).default([]);

/** Validated shape of one vision-model response. */
export const imageExtractionSchema = z.object({
  extractedText: z.string().max(5000).default(''),
  description: z.string().min(1).max(3000),
  detectedElements: z
    .object({
      people: list,
      products: list,
      logos: list,
      textOverlays: list,
      claims: list,
      badges: list,
    })
    .default({}),
  possibleConcerns: z.array(z.string().max(600)).max(20).default([]),
});
export type ImageExtractionOutput = z.infer<typeof imageExtractionSchema>;

const EMPTY_ELEMENTS = {
  people: [],
  products: [],
  logos: [],
  textOverlays: [],
  claims: [],
  badges: [],
};

const SYSTEM = `You are the Image Extraction step inside Guardrail, a marketing compliance review tool.
You receive ONE campaign image. Describe only what is visibly present.

Rules:
1. extractedText: transcribe ALL visible text verbatim (overlays, badges, fine print, packaging), one item per line. Do not paraphrase or correct it. Empty string if none.
2. description: 1-3 factual sentences on what the image shows.
3. detectedElements: people (describe, never identify real individuals), products, logos/brand marks, textOverlays (each text block), claims (any marketing/health/pricing/performance claim in the image), badges (seals, certifications, "No.1", "%" stickers, etc.).
4. possibleConcerns: short notes on anything a compliance reviewer may want to check (unsubstantiated claims, extreme discounts, missing disclaimers, sensitive imagery). Empty if none. Do not invent regulations.
5. Respond as JSON matching the ImageExtraction schema.`;

export interface ImageInput {
  assetId: string;
  title?: string;
  mimeType: string;
  data: Buffer;
}

export async function extractImages(opts: {
  analysisRunId: string;
  images: ImageInput[];
  llm?: LLMProvider;
}): Promise<ImageExtraction[]> {
  const llm = opts.llm ?? getLLMProvider();
  const results: ImageExtraction[] = [];
  for (const [i, img] of opts.images.entries()) {
    const imageIndex = i + 1;
    const base = {
      id: randomUUID(),
      analysisRunId: opts.analysisRunId,
      assetId: img.assetId,
      imageIndex,
      title: img.title,
      mimeType: img.mimeType,
      createdAt: new Date().toISOString(),
    };
    try {
      const { data, model } = await llm.completeStructured<ImageExtractionOutput>({
        schemaName: 'ImageExtraction',
        schema: imageExtractionSchema,
        system: SYSTEM,
        prompt: `Campaign image ${imageIndex}${img.title ? ` ("${img.title}")` : ''}. Extract text, describe it and list elements/concerns as JSON: { extractedText, description, detectedElements: { people, products, logos, textOverlays, claims, badges }, possibleConcerns }.`,
        images: [{ mimeType: img.mimeType, dataBase64: img.data.toString('base64') }],
        temperature: 0,
        metadata: { imageIndex, imageTitle: img.title ?? `image ${imageIndex}` },
      });
      results.push({ ...base, status: 'completed', ...data, model });
    } catch (err) {
      const cause = err instanceof Error && err.cause instanceof Error ? `: ${err.cause.message}` : '';
      const message = (err instanceof Error ? err.message : String(err)) + cause;
      log.warn({ err, imageIndex, assetId: img.assetId }, 'image_extraction_failed');
      results.push({
        ...base,
        status: 'failed',
        extractedText: '',
        description: '',
        detectedElements: { ...EMPTY_ELEMENTS },
        possibleConcerns: [],
        error: message.slice(0, 1000),
      });
    }
  }
  return results;
}

/** A failed image must never pass silently: one high-severity review finding each. */
export function imageFailureFindings(
  extractions: ImageExtraction[],
  analysisRunId: string,
): Finding[] {
  return extractions
    .filter((x) => x.status === 'failed')
    .map((x) => ({
      id: randomUUID(),
      analysisRunId,
      producedBy: 'rule_engine' as const,
      ruleId: 'image_extraction_failed',
      category: 'other' as const,
      severity: 'high' as const,
      title: `[Image ${x.imageIndex}] Image could not be analysed`,
      explanation: `Text and content extraction failed for image ${x.imageIndex}${x.title ? ` ("${x.title}")` : ''}, so its text, claims and visuals were NOT checked by rules or agents. Error: ${x.error ?? 'unknown'}`,
      confidence: 1,
      requiresHumanReview: true,
      evidenceRequired: false,
      evidenceStatus: 'REQUIRES_HUMAN_REVIEW' as const,
      evidence: [],
      suggestedAction: 'Review this image manually or re-run the analysis.',
      sourceImageIndex: x.imageIndex,
      createdAt: new Date().toISOString(),
    }));
}

export function combinedCampaignText(copy: string, images: ImageExtraction[]): string {
  const parts = [copy];
  for (const img of images) {
    if (img.status === 'completed' && img.extractedText.trim()) parts.push(img.extractedText);
  }
  return parts.join('\n\n');
}

/** Prompt block appended after CAMPAIGN COPY in every agent prompt. */
export function formatImagesForPrompt(ctx: CampaignContext, opts: { sourceImageHint?: boolean } = {}): string {
  const images = ctx.images ?? [];
  if (images.length === 0) return '';
  const q = (s: string) => s.replace(/"""/g, "'''");
  const blocks = images.map((img) => {
    if (img.status !== 'completed') {
      return `image ${img.imageIndex}: EXTRACTION FAILED (content unknown; do not assume it is compliant)`;
    }
    const el = img.detectedElements;
    const line = (k: string, v: string[]) => (v.length ? `\n  ${k}: ${v.map(q).join('; ')}` : '');
    return `image ${img.imageIndex}${img.title ? ` (${q(img.title)})` : ''}:
  extractedText: """${q(img.extractedText) || '(none)'}"""
  description: """${q(img.description)}"""${line('claims', el.claims)}${line('badges', el.badges)}${line('people', el.people)}${line('products', el.products)}${line('logos', el.logos)}${line('possibleConcerns', img.possibleConcerns)}`;
  });
  return `

CAMPAIGN IMAGES (machine-extracted text and descriptions; part of the campaign creative)
${blocks.join('\n\n')}${opts.sourceImageHint === false ? '\nRefer to images as "image N" where relevant.' : `
When an issue comes from an image, set "sourceImage" to that image number (e.g. 1) and mention "image N" in the explanation. Omit sourceImage for issues from the copy.`}`;
}

/** Text for KB retrieval queries (copy plus image text). */
export function retrievalText(ctx: CampaignContext): string {
  return ctx.combinedText ?? ctx.copy;
}

/** Zod field agents add to their item schemas. */
export const sourceImageField = z.number().int().min(1).max(50).optional().catch(undefined);

/** Accept an agent's sourceImage only if it names a real image. */
export function validImageIndex(ctx: CampaignContext, n: number | undefined): number | undefined {
  if (n === undefined) return undefined;
  return (ctx.images ?? []).some((i) => i.imageIndex === n) ? n : undefined;
}
