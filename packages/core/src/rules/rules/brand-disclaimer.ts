import { buildFinding, type Rule } from '../base';

export const brandDisclaimerRule: Rule = {
  id: 'brand_disclaimer_required',
  name: 'Brand disclaimer required',
  description:
    'When a campaign references cultural or festival context, the brand policy expects a "responsible celebration" disclaimer.',

  applicableWhen: (ctx) => Boolean(ctx.festivalContext),

  evaluate(ctx, runId) {
    const has = /celebrate\s+responsibly|responsible\s+celebration|responsibly\b/i.test(
      ctx.copy,
    );
    if (has) return [];
    return [
      buildFinding(this, runId, {
        category: 'brand_policy',
        severity: 'low',
        title: 'Festival campaign missing responsible-celebration disclaimer',
        explanation:
          'The internal brand policy asks for a "celebrate responsibly" line in any festival-linked campaign.',
        evidenceRequired: false,
        suggestedAction: 'Add a short "celebrate responsibly" note near the CTA.',
      }),
    ];
  },
};
