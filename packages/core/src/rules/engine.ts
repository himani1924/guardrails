import { getLogger } from '../logging';
import type { CampaignContext } from '../types/campaign';
import type { Finding } from '../types/finding';

import type { Rule } from './base';
import { brandDisclaimerRule } from './rules/brand-disclaimer';
import { campaignMetadataRule } from './rules/campaign-metadata';
import { discountFormatRule } from './rules/discount-format';
import { healthClaimRule } from './rules/health-claim';
import { influencerDisclosureRule } from './rules/influencer-disclosure';
import { requiredDisclaimerRule } from './rules/required-disclaimer';

const log = getLogger({ component: 'rules.engine' });

export const RULES: Rule[] = [
  campaignMetadataRule,
  requiredDisclaimerRule,
  discountFormatRule,
  influencerDisclosureRule,
  healthClaimRule,
  brandDisclaimerRule,
];

export interface RuleEngineResult {
  findings: Finding[];
  evaluatedRuleIds: string[];
  skippedRuleIds: string[];
}

export function runRuleEngine(
  ctx: CampaignContext,
  analysisRunId: string,
  rules: Rule[] = RULES,
): RuleEngineResult {
  const evaluatedRuleIds: string[] = [];
  const skippedRuleIds: string[] = [];
  const findings: Finding[] = [];

  for (const rule of rules) {
    if (!rule.applicableWhen(ctx)) {
      skippedRuleIds.push(rule.id);
      continue;
    }
    evaluatedRuleIds.push(rule.id);
    try {
      findings.push(...rule.evaluate(ctx, analysisRunId));
    } catch (err) {
      log.error({ err, ruleId: rule.id }, 'rule_failed');
    }
  }

  // Second pass: content-scanning rules over each image's extracted text.
  for (const img of ctx.images ?? []) {
    const text = img.status === 'completed' ? img.extractedText.trim() : '';
    if (!text) continue;
    const imageCtx: CampaignContext = { ...ctx, copy: text };
    for (const rule of rules) {
      if (!rule.scansContent || !rule.applicableWhen(imageCtx)) continue;
      try {
        for (const f of rule.evaluate(imageCtx, analysisRunId)) {
          findings.push(labelImageFinding(f, img.imageIndex));
        }
      } catch (err) {
        log.error({ err, ruleId: rule.id, imageIndex: img.imageIndex }, 'rule_failed');
      }
    }
  }

  return { findings, evaluatedRuleIds, skippedRuleIds };
}

function labelImageFinding(f: Finding, imageIndex: number): Finding {
  return {
    ...f,
    title: `[Image ${imageIndex}] ${f.title}`,
    explanation: `Text extracted from image ${imageIndex}: ${f.explanation.replace(/^The copy contains/, 'The image contains')}`,
    sourceImageIndex: imageIndex,
  };
}
