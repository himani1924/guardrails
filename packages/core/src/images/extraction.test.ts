import { describe, expect, it } from 'vitest';

import { MockLLMProvider } from '../ai/mock-provider';
import { runRuleEngine } from '../rules/engine';
import type { CampaignContext } from '../types/campaign';
import type { ImageExtraction } from '../types/image';

import {
  combinedCampaignText,
  extractImages,
  formatImagesForPrompt,
  imageExtractionSchema,
  imageFailureFindings,
  validImageIndex,
} from './extraction';

const png = { assetId: 'a1', title: 'hero.png', mimeType: 'image/png', data: Buffer.from('x') };

function img(overrides: Partial<ImageExtraction> = {}): ImageExtraction {
  return {
    id: 'i1',
    analysisRunId: 'run',
    imageIndex: 1,
    status: 'completed',
    extractedText: '',
    description: 'A product shot.',
    detectedElements: { people: [], products: [], logos: [], textOverlays: [], claims: [], badges: [] },
    possibleConcerns: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function ctx(overrides: Partial<CampaignContext> = {}): CampaignContext {
  return {
    campaignId: 'c1',
    name: 'Test',
    copy: 'Our new serum is here. T&C apply.',
    campaignType: 'promotional',
    platform: 'instagram',
    geography: { country: 'IN' },
    audienceSegmentKeys: ['general_audience'],
    assets: [],
    applicablePolicyContext: [],
    ...overrides,
  };
}

describe('imageExtractionSchema', () => {
  it('fills defaults for missing lists', () => {
    const out = imageExtractionSchema.parse({ description: 'A banner.' });
    expect(out.extractedText).toBe('');
    expect(out.detectedElements.claims).toEqual([]);
    expect(out.possibleConcerns).toEqual([]);
  });

  it('rejects a response without a description', () => {
    expect(imageExtractionSchema.safeParse({ extractedText: 'hi' }).success).toBe(false);
  });

  it('rejects wrongly typed element lists', () => {
    expect(
      imageExtractionSchema.safeParse({ description: 'x', detectedElements: { claims: 'one' } }).success,
    ).toBe(false);
  });
});

describe('mock provider image extraction', () => {
  it('returns a deterministic fixture and passes the image to the provider', async () => {
    const mock = new MockLLMProvider();
    const a = await extractImages({ analysisRunId: 'run', images: [png], llm: mock });
    const b = await extractImages({ analysisRunId: 'run', images: [png], llm: mock });
    expect(a[0]!.status).toBe('completed');
    expect(a[0]!.description).toContain('hero.png');
    expect(a[0]!.description).toBe(b[0]!.description);
    expect(a[0]!.imageIndex).toBe(1);
  });

  it('marks an image failed (not silently skipped) and emits a review finding', async () => {
    const mock = new MockLLMProvider();
    mock.failOnce(new Error('vision timeout'));
    const res = await extractImages({
      analysisRunId: 'run',
      images: [png, { ...png, assetId: 'a2', title: 'second.png' }],
      llm: mock,
    });
    expect(res.map((r) => r.status)).toEqual(['failed', 'completed']);
    expect(res[0]!.error).toContain('vision timeout');
    const findings = imageFailureFindings(res, 'run');
    expect(findings).toHaveLength(1);
    expect(findings[0]!.sourceImageIndex).toBe(1);
    expect(findings[0]!.requiresHumanReview).toBe(true);
    expect(formatImagesForPrompt(ctx({ images: res }))).toContain('image 1: EXTRACTION FAILED');
  });

  it('rejects an invalid vision response as a failed extraction', async () => {
    const mock = new MockLLMProvider();
    mock.setNextResponse({ extractedText: 5 });
    const [r] = await extractImages({ analysisRunId: 'run', images: [png], llm: mock });
    expect(r!.status).toBe('failed');
  });
});

describe('rules over image text', () => {
  it('flags risky overlay text and labels the source image', () => {
    const images = [img({ imageIndex: 2, extractedText: 'UP TO 100% OFF\nClinically proven' })];
    const c = ctx({ images, combinedText: combinedCampaignText('Our new serum is here. T&C apply.', images) });
    const { findings } = runRuleEngine(c, 'run');
    const fromImage = findings.filter((f) => f.sourceImageIndex === 2);
    const titles = fromImage.map((f) => f.title);
    expect(titles).toContain('[Image 2] Suspicious discount percentage');
    expect(titles).toContain('[Image 2] Health-style claim detected — evidence required');
    expect(findings.filter((f) => f.sourceImageIndex === undefined).map((f) => f.title)).not.toContain(
      'Suspicious discount percentage',
    );
  });

  it('accepts a disclaimer that only appears in an image', () => {
    const images = [img({ extractedText: '20% off this weekend only. T&C apply' })];
    const copy = '20% off our serum';
    const { findings } = runRuleEngine(
      ctx({ copy, images, combinedText: combinedCampaignText(copy, images) }),
      'run',
    );
    const titles = findings.map((f) => f.title);
    expect(titles).not.toContain('Disclaimer marker not found in campaign copy');
    expect(titles).not.toContain('Discount without stated offer window');
  });

  it('ignores text of failed extractions and validates agent image citations', () => {
    const images = [img({ status: 'failed', extractedText: 'Clinically proven' })];
    const c = ctx({ images });
    expect(runRuleEngine(c, 'run').findings.some((f) => f.sourceImageIndex)).toBe(false);
    expect(validImageIndex(c, 1)).toBe(1);
    expect(validImageIndex(c, 3)).toBeUndefined();
  });
});
