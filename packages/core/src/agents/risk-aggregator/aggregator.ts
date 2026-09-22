import { randomUUID } from 'node:crypto';

import type { AudiencePerspectiveResult } from '../../types/audience';
import type { AgentKind, FindingCategory, RiskDimension, RiskLevel } from '../../types/enums';
import type { Finding } from '../../types/finding';
import type { RiskAssessment } from '../../types/risk';

/**
 * Deterministic per-dimension aggregator. The LLM does NOT decide the final
 * risk level — it only produces findings. The mapping from findings to
 * dimensions and from findings to a level is coded here so it is
 * inspectable and reproducible.
 *
 * Documented rules:
 *   compliance   ← producedBy in {compliance, rule_engine} with category ≠ sentiment/cultural/audience_polarization
 *   cultural     ← producedBy = cultural  OR  category = cultural
 *   sentiment    ← producedBy = sentiment OR  category = sentiment
 *   brand        ← category = brand_policy
 *   polarization ← category = audience_polarization
 *   evidence     ← any finding with evidenceRequired=true whose evidenceStatus ∈ {NOT_FOUND, INSUFFICIENT_EVIDENCE, REQUIRES_HUMAN_REVIEW}
 *
 * Level rules per dimension (evaluated on the findings for that dimension):
 *   critical   → any critical severity
 *   high       → any high severity
 *   medium     → any medium severity, OR ≥2 low severities
 *   low        → exactly one low or info finding
 *   unknown    → no findings AND no confident opinion (only used when input is empty)
 */
const CATEGORY_TO_DIMENSION: Partial<Record<FindingCategory, RiskDimension>> = {
  cultural: 'cultural',
  sentiment: 'sentiment',
  brand_policy: 'brand',
  audience_polarization: 'polarization',
};

const COMPLIANCE_KINDS: AgentKind[] = ['compliance', 'rule_engine'];

export interface AggregatorInput {
  findings: Finding[];
  perspectives: AudiencePerspectiveResult[];
  analysisRunId: string;
}

export function aggregateRisks(input: AggregatorInput): RiskAssessment[] {
  const buckets: Record<RiskDimension, Finding[]> = {
    compliance: [],
    cultural: [],
    sentiment: [],
    brand: [],
    evidence: [],
    polarization: [],
  };

  for (const f of input.findings) {
    const catDim = CATEGORY_TO_DIMENSION[f.category];
    if (catDim) buckets[catDim].push(f);
    else if (COMPLIANCE_KINDS.includes(f.producedBy)) buckets.compliance.push(f);

    if (
      f.evidenceRequired &&
      (f.evidenceStatus === 'NOT_FOUND' ||
        f.evidenceStatus === 'INSUFFICIENT_EVIDENCE' ||
        f.evidenceStatus === 'REQUIRES_HUMAN_REVIEW')
    ) {
      buckets.evidence.push(f);
    }
  }

  // Boost polarization if perspectives disagree meaningfully.
  const polarizationBoost = computePolarizationBoost(input.perspectives);

  const now = new Date().toISOString();
  const dimensions: RiskDimension[] = [
    'compliance',
    'cultural',
    'sentiment',
    'brand',
    'evidence',
    'polarization',
  ];

  return dimensions.map((dim) => {
    const bucket = buckets[dim];
    const level = computeLevel(dim, bucket, dim === 'polarization' ? polarizationBoost : 0);
    const reasons = describeReasons(dim, bucket, polarizationBoost);
    const supportingFindingIds = bucket.map((f) => f.id);
    const humanReviewRequired =
      level === 'critical' ||
      level === 'high' ||
      bucket.some((f) => f.requiresHumanReview) ||
      (dim === 'evidence' && bucket.length > 0);
    const confidence = deriveConfidence(bucket);

    return {
      id: randomUUID(),
      analysisRunId: input.analysisRunId,
      dimension: dim,
      level,
      reasons,
      supportingFindingIds,
      confidence,
      uncertainty: bucket.some((f) => f.uncertainty)
        ? 'Confidence lowered by uncertain agent output.'
        : undefined,
      humanReviewRequired,
      createdAt: now,
    } satisfies RiskAssessment;
  });
}

function computeLevel(
  _dim: RiskDimension,
  bucket: Finding[],
  boost: number,
): RiskLevel {
  if (bucket.length === 0 && boost === 0) return 'unknown';
  const hasCritical = bucket.some((f) => f.severity === 'critical');
  if (hasCritical) return 'critical';
  const hasHigh = bucket.some((f) => f.severity === 'high') || boost >= 2;
  if (hasHigh) return 'high';
  const mediumCount = bucket.filter((f) => f.severity === 'medium').length + (boost === 1 ? 1 : 0);
  const lowCount = bucket.filter((f) => f.severity === 'low').length;
  if (mediumCount >= 1 || lowCount >= 2) return 'medium';
  if (lowCount === 1 || bucket.some((f) => f.severity === 'info')) return 'low';
  return 'unknown';
}

function describeReasons(
  dim: RiskDimension,
  bucket: Finding[],
  boost: number,
): string[] {
  const reasons = bucket.slice(0, 4).map((f) => `${f.severity.toUpperCase()}: ${f.title}`);
  if (dim === 'polarization' && boost >= 2) {
    reasons.push('Multiple audience perspectives show conflicting signals.');
  } else if (dim === 'polarization' && boost === 1) {
    reasons.push('Some audience perspectives show conflicting signals.');
  }
  if (dim === 'evidence' && bucket.length > 0) {
    reasons.push('Some findings require evidence that could not be verified.');
  }
  return reasons.length > 0 ? reasons : ['No signals detected for this dimension.'];
}

function deriveConfidence(bucket: Finding[]): number {
  if (bucket.length === 0) return 0.7;
  const avg = bucket.reduce((s, f) => s + f.confidence, 0) / bucket.length;
  return Math.round(avg * 1000) / 1000;
}

function computePolarizationBoost(perspectives: AudiencePerspectiveResult[]): number {
  if (perspectives.length < 2) return 0;
  let disagreements = 0;
  for (const p of perspectives) {
    if (p.concernSignals.length >= 1 && p.positiveSignals.length >= 1) disagreements++;
  }
  const withConcern = perspectives.filter((p) => p.concernSignals.length > 0).length;
  const withoutConcern = perspectives.filter((p) => p.concernSignals.length === 0).length;
  if (withConcern >= 1 && withoutConcern >= 1) disagreements++;
  return disagreements;
}
