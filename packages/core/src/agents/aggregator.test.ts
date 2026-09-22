import { describe, expect, it } from 'vitest';

import { aggregateRisks } from '../agents/risk-aggregator/aggregator';
import type { AudiencePerspectiveResult } from '../types/audience';
import type { Finding } from '../types/finding';

function finding(overrides: Partial<Finding>): Finding {
  return {
    id: overrides.id ?? 'f',
    analysisRunId: 'r',
    producedBy: overrides.producedBy ?? 'compliance',
    category: overrides.category ?? 'other',
    severity: overrides.severity ?? 'low',
    title: overrides.title ?? 't',
    explanation: 'e',
    confidence: 0.9,
    requiresHumanReview: overrides.requiresHumanReview ?? false,
    evidenceRequired: overrides.evidenceRequired ?? false,
    evidenceStatus: overrides.evidenceStatus ?? 'NOT_APPLICABLE',
    evidence: [],
    createdAt: '',
    ...overrides,
  };
}

describe('risk aggregator', () => {
  it('returns "unknown" for a dimension with no findings', () => {
    const risks = aggregateRisks({ findings: [], perspectives: [], analysisRunId: 'r' });
    expect(risks.every((r) => r.level === 'unknown')).toBe(true);
  });

  it('maps a high compliance finding to compliance=high', () => {
    const risks = aggregateRisks({
      findings: [finding({ id: '1', producedBy: 'compliance', category: 'unsupported_claim', severity: 'high' })],
      perspectives: [],
      analysisRunId: 'r',
    });
    const compliance = risks.find((r) => r.dimension === 'compliance');
    expect(compliance?.level).toBe('high');
    expect(compliance?.humanReviewRequired).toBe(true);
  });

  it('maps a cultural finding to cultural dimension only', () => {
    const risks = aggregateRisks({
      findings: [finding({ id: '1', producedBy: 'cultural', category: 'cultural', severity: 'high' })],
      perspectives: [],
      analysisRunId: 'r',
    });
    expect(risks.find((r) => r.dimension === 'cultural')?.level).toBe('high');
    expect(risks.find((r) => r.dimension === 'compliance')?.level).toBe('unknown');
  });

  it('flags evidence dimension when required-evidence is missing', () => {
    const risks = aggregateRisks({
      findings: [
        finding({
          id: '1',
          category: 'unsupported_claim',
          severity: 'high',
          evidenceRequired: true,
          evidenceStatus: 'NOT_FOUND',
        }),
      ],
      perspectives: [],
      analysisRunId: 'r',
    });
    const evidence = risks.find((r) => r.dimension === 'evidence');
    expect(evidence?.level).not.toBe('unknown');
    expect(evidence?.humanReviewRequired).toBe(true);
  });

  it('raises polarization when perspectives disagree', () => {
    const perspectives: AudiencePerspectiveResult[] = [
      {
        id: 'p1',
        analysisRunId: 'r',
        audienceSegmentId: 's1',
        audienceSegmentKey: 'a',
        possibleInterpretation: 'x',
        positiveSignals: ['a'],
        concernSignals: [],
        confidence: 0.7,
        createdAt: '',
      },
      {
        id: 'p2',
        analysisRunId: 'r',
        audienceSegmentId: 's2',
        audienceSegmentKey: 'b',
        possibleInterpretation: 'x',
        positiveSignals: [],
        concernSignals: ['y'],
        confidence: 0.7,
        createdAt: '',
      },
    ];
    const risks = aggregateRisks({ findings: [], perspectives, analysisRunId: 'r' });
    const pol = risks.find((r) => r.dimension === 'polarization');
    expect(pol?.level === 'medium' || pol?.level === 'high').toBe(true);
  });
});
