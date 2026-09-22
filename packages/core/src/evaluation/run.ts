import { runAnalysis, getAnalysisRun } from '../analyses';
import { closeDb } from '../db/client';
import { getLogger } from '../logging';

import { EVAL_CASES, findCampaignByPrefix, type EvalCase } from './dataset';

const log = getLogger({ component: 'evaluation' });

interface CaseResult {
  case: EvalCase;
  campaignId: string | null;
  passed: boolean;
  reasons: string[];
  measured: {
    complianceLevel?: string;
    culturalLevel?: string;
    polarizationLevel?: string;
    findings: number;
    requiresHumanReview: boolean;
    fabricatedEvidence: boolean;
    latencyMs?: number;
    totalPromptTokens?: number;
    totalCompletionTokens?: number;
  };
}

async function runOne(c: EvalCase): Promise<CaseResult> {
  const campaignId = await findCampaignByPrefix(c.campaignNamePrefix);
  if (!campaignId) {
    return {
      case: c,
      campaignId: null,
      passed: false,
      reasons: [`No seeded campaign found with prefix "${c.campaignNamePrefix}"`],
      measured: { findings: 0, requiresHumanReview: false, fabricatedEvidence: false },
    };
  }

  const { analysisRunId } = await runAnalysis({ campaignId, requestedBy: 'evaluation' });
  const result = await getAnalysisRun(analysisRunId);

  const compliance = result.risks.find((r) => r.dimension === 'compliance');
  const cultural = result.risks.find((r) => r.dimension === 'cultural');
  const polarization = result.risks.find((r) => r.dimension === 'polarization');
  const requiresReview = result.risks.some((r) => r.humanReviewRequired);

  // "Fabricated evidence" = a finding claims SUPPORTED but has zero evidence rows.
  const fabricated = result.findings.some(
    (f) => f.evidenceStatus === 'SUPPORTED' && f.evidence.length === 0,
  );

  const reasons: string[] = [];
  if (!compareLevel(compliance?.level, c.expected.minComplianceLevel, c.expected.maxComplianceLevel)) {
    reasons.push(
      `compliance level ${compliance?.level ?? 'unknown'} outside expected range ${c.expected.minComplianceLevel}${
        c.expected.maxComplianceLevel ? '..' + c.expected.maxComplianceLevel : '+'
      }`,
    );
  }
  if (c.expected.culturalLevelIn && !inLevelSet(cultural?.level, c.expected.culturalLevelIn)) {
    reasons.push(`cultural level ${cultural?.level} not in ${c.expected.culturalLevelIn.join(',')}`);
  }
  if (
    c.expected.polarizationLevelIn &&
    !inLevelSet(polarization?.level, c.expected.polarizationLevelIn)
  ) {
    reasons.push(
      `polarization level ${polarization?.level} not in ${c.expected.polarizationLevelIn.join(',')}`,
    );
  }
  if (c.expected.requiresHumanReview !== requiresReview) {
    reasons.push(
      `requiresHumanReview expected ${c.expected.requiresHumanReview}, got ${requiresReview}`,
    );
  }
  if (c.expected.mustFlagCategories) {
    for (const cat of c.expected.mustFlagCategories) {
      if (!result.findings.some((f) => f.category === cat)) {
        reasons.push(`missing expected finding category "${cat}"`);
      }
    }
  }
  if (c.expected.mustNotFabricateEvidence && fabricated) {
    reasons.push('at least one finding is SUPPORTED but has no evidence rows (fabricated)');
  }

  return {
    case: c,
    campaignId,
    passed: reasons.length === 0,
    reasons,
    measured: {
      complianceLevel: compliance?.level,
      culturalLevel: cultural?.level,
      polarizationLevel: polarization?.level,
      findings: result.findings.length,
      requiresHumanReview: requiresReview,
      fabricatedEvidence: fabricated,
      latencyMs: result.latencyMs,
      totalPromptTokens: result.totalPromptTokens,
      totalCompletionTokens: result.totalCompletionTokens,
    },
  };
}

function compareLevel(
  actual: string | undefined,
  min: 'low' | 'medium' | 'high',
  max?: 'low' | 'medium' | 'high',
): boolean {
  if (!actual) return false;
  // "unknown" = no signals detected. For any expected minimum of `low` we
  // treat unknown as acceptable — no signal is a good outcome for safe
  // campaigns.
  if (actual === 'unknown') return min === 'low';
  const order = ['unknown', 'low', 'medium', 'high', 'critical'] as const;
  const actualRank = order.indexOf(actual as (typeof order)[number]);
  const minRank = order.indexOf(min);
  const maxRank = max ? order.indexOf(max) : order.length;
  return actualRank >= minRank && actualRank <= maxRank;
}

// Same "unknown = no signal, treat as low" convention when checking membership.
function inLevelSet(
  actual: string | undefined,
  accepted: Array<'low' | 'medium' | 'high'>,
): boolean {
  if (!actual) return false;
  if (actual === 'unknown') return accepted.includes('low');
  return accepted.includes(actual as 'low' | 'medium' | 'high');
}

async function main(): Promise<void> {
  log.info({ cases: EVAL_CASES.length }, 'evaluation_start');
  const results: CaseResult[] = [];
  for (const c of EVAL_CASES) {
    const r = await runOne(c);
    results.push(r);
    log.info(
      {
        campaign: c.campaignNamePrefix,
        passed: r.passed,
        reasons: r.reasons,
        measured: r.measured,
      },
      r.passed ? 'case_passed' : 'case_failed',
    );
  }
  const passed = results.filter((r) => r.passed).length;
  log.info(
    {
      total: results.length,
      passed,
      failed: results.length - passed,
      passRate: results.length === 0 ? 0 : passed / results.length,
    },
    'evaluation_report',
  );

  // Print a compact JSON report to stdout for easy piping.
  console.log(
    JSON.stringify(
      {
        total: results.length,
        passed,
        failed: results.length - passed,
        cases: results.map((r) => ({
          campaign: r.case.campaignNamePrefix,
          passed: r.passed,
          reasons: r.reasons,
          measured: r.measured,
        })),
      },
      null,
      2,
    ),
  );
}

const isEntrypoint =
  import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` ||
  import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`;

if (isEntrypoint) {
  main()
    .then(async () => {
      await closeDb();
      process.exit(0);
    })
    .catch(async (err: unknown) => {
      log.error({ err }, 'evaluation_failed');
      await closeDb();
      process.exit(1);
    });
}
