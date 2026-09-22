import { buildFinding, type Rule } from '../base';

const DISCOUNT_PATTERNS = [/\b(\d{1,3})\s*%\s*off\b/i, /\bflat\s*(\d{1,3})\s*%\b/i];

export const discountFormatRule: Rule = {
  id: 'discount_format',
  name: 'Discount claim format',
  description:
    'Any discount claim must be within 1-100% and, for MVP, must be paired with an offer window.',

  applicableWhen: () => true,

  evaluate(ctx, runId) {
    const findings = [];
    for (const pattern of DISCOUNT_PATTERNS) {
      const m = ctx.copy.match(pattern);
      if (!m) continue;
      const pct = Number(m[1]);
      if (Number.isNaN(pct) || pct <= 0 || pct >= 100) {
        findings.push(
          buildFinding(this, runId, {
            category: 'pricing',
            severity: 'medium',
            title: 'Suspicious discount percentage',
            explanation: `The copy contains a discount ("${m[0]}") that resolves to ${pct}%. Percentages must be strictly between 1 and 99.`,
            affectedContent: m[0],
            evidenceRequired: false,
            suggestedAction: 'Clarify or correct the advertised discount.',
          }),
        );
      }

      const hasWindow =
        /this\s+weekend|today\s+only|until\s+\d|ends\s+\d|for\s+a\s+limited\s+time|weekend\s+only/i.test(
          ctx.copy,
        );
      if (!hasWindow) {
        findings.push(
          buildFinding(this, runId, {
            category: 'pricing',
            severity: 'low',
            title: 'Discount without stated offer window',
            explanation:
              'A discount is advertised but the copy does not state when the offer starts or ends.',
            affectedContent: m[0],
            evidenceRequired: false,
            suggestedAction: 'State an explicit start and end date for the discount.',
          }),
        );
      }
    }
    return findings;
  },
};
