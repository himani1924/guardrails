import { eq } from 'drizzle-orm';

import { getDb } from '../db/client';
import { campaigns } from '../db/schema';

/**
 * Small evaluation dataset. Each entry describes the *expected* outcome for
 * one of the seeded demo campaigns; the eval runner triggers analysis and
 * compares actual results against expected.
 */
export interface EvalCase {
  campaignNamePrefix: string;
  expected: {
    minComplianceLevel: 'low' | 'medium' | 'high';
    maxComplianceLevel?: 'low' | 'medium' | 'high';
    culturalLevelIn?: Array<'low' | 'medium' | 'high'>;
    polarizationLevelIn?: Array<'low' | 'medium' | 'high'>;
    requiresHumanReview: boolean;
    mustFlagCategories?: string[];
    mustNotFabricateEvidence?: boolean;
  };
}

export const EVAL_CASES: EvalCase[] = [
  {
    campaignNamePrefix: '[Demo] Autumn Skincare Refresh',
    expected: {
      minComplianceLevel: 'low',
      maxComplianceLevel: 'low',
      culturalLevelIn: ['low', 'medium'],
      polarizationLevelIn: ['low', 'medium'],
      requiresHumanReview: false,
    },
  },
  {
    campaignNamePrefix: '[Demo] Flash Weekend Sale',
    expected: {
      minComplianceLevel: 'high',
      requiresHumanReview: true,
      mustFlagCategories: ['unsupported_claim'],
      mustNotFabricateEvidence: true,
    },
  },
  {
    campaignNamePrefix: '[Demo] Diwali Home Collection',
    expected: {
      minComplianceLevel: 'low',
      culturalLevelIn: ['high'],
      polarizationLevelIn: ['high'],
      requiresHumanReview: true,
    },
  },
  {
    campaignNamePrefix: '[Demo] Wellness Tea',
    expected: {
      minComplianceLevel: 'medium',
      requiresHumanReview: true,
      mustNotFabricateEvidence: true,
    },
  },
];

export async function findCampaignByPrefix(prefix: string): Promise<string | null> {
  const db = getDb();
  const rows = await db.select().from(campaigns);
  const match = rows.find((r) => r.name.startsWith(prefix));
  return match ? match.id : null;
}

// Small helper — reused by the runner.
export function _touch() {
  return eq;
}
