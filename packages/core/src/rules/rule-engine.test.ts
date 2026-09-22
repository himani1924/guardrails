import { describe, expect, it } from 'vitest';

import { runRuleEngine } from '../rules/engine';
import type { CampaignContext } from '../types/campaign';

function ctx(overrides: Partial<CampaignContext> = {}): CampaignContext {
  return {
    campaignId: 'c1',
    name: 'Test',
    copy: 'Standard copy.',
    campaignType: 'brand',
    platform: 'instagram',
    geography: { country: 'IN' },
    audienceSegmentKeys: ['general_audience'],
    assets: [],
    applicablePolicyContext: [],
    ...overrides,
  };
}

describe('rule engine', () => {
  it('emits no findings for a clean brand campaign', () => {
    const { findings, evaluatedRuleIds } = runRuleEngine(ctx(), 'run-1');
    expect(findings.map((f) => f.title)).toEqual([]);
    expect(evaluatedRuleIds.length).toBeGreaterThan(0);
  });

  it('flags a promotional campaign missing a disclaimer', () => {
    const { findings } = runRuleEngine(
      ctx({ campaignType: 'promotional', copy: '50% off this weekend only.' }),
      'run-2',
    );
    const titles = findings.map((f) => f.title);
    expect(titles).toContain('Disclaimer marker not found in campaign copy');
  });

  it('does not flag disclaimer when T&C apply is present', () => {
    const { findings } = runRuleEngine(
      ctx({
        campaignType: 'promotional',
        copy: 'Buy one get one this weekend only. T&C apply.',
      }),
      'run-3',
    );
    expect(findings.some((f) => f.category === 'missing_disclaimer')).toBe(false);
  });

  it('flags an influencer campaign missing #ad', () => {
    const { findings } = runRuleEngine(
      ctx({ campaignType: 'influencer', copy: 'Loving this brand!' }),
      'run-4',
    );
    expect(findings.some((f) => f.category === 'influencer_disclosure')).toBe(true);
  });

  it('flags "clinically proven" as a health claim requiring review', () => {
    const { findings } = runRuleEngine(
      ctx({ copy: 'New serum clinically proven to deliver visible results.' }),
      'run-5',
    );
    const health = findings.find((f) => f.ruleId === 'health_claim_requires_evidence');
    expect(health).toBeDefined();
    expect(health?.requiresHumanReview).toBe(true);
    expect(health?.evidenceRequired).toBe(true);
  });

  it('flags festival campaigns without a responsible-celebration line', () => {
    const { findings } = runRuleEngine(
      ctx({
        festivalContext: { key: 'diwali', name: 'Diwali' },
        copy: 'Bring warmth home this Diwali.',
      }),
      'run-6',
    );
    expect(findings.some((f) => f.ruleId === 'brand_disclaimer_required')).toBe(true);
  });
});
