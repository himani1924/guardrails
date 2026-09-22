import { buildFinding, type Rule } from '../base';

const DISCLAIMER_REQUIRED_TYPES: Array<'promotional' | 'influencer'> = [
  'promotional',
  'influencer',
];

const DISCLAIMER_MARKERS = [
  't&c apply',
  'terms and conditions apply',
  'terms apply',
  '*terms',
  '#ad',
  '#sponsored',
];

export const requiredDisclaimerRule: Rule = {
  id: 'required_disclaimer_missing',
  name: 'Required disclaimer missing',
  description:
    'Promotional and influencer campaigns must contain an explicit disclaimer marker.',

  applicableWhen(ctx) {
    return DISCLAIMER_REQUIRED_TYPES.includes(
      ctx.campaignType as 'promotional' | 'influencer',
    );
  },

  evaluate(ctx, runId) {
    const haystack = ctx.copy.toLowerCase();
    if (DISCLAIMER_MARKERS.some((m) => haystack.includes(m))) return [];
    return [
      buildFinding(this, runId, {
        category: 'missing_disclaimer',
        severity: 'medium',
        title: 'Disclaimer marker not found in campaign copy',
        explanation:
          'The campaign is promotional or influencer-driven but the copy does not include a standard disclaimer marker such as "T&C apply" or "#ad".',
        affectedContent: ctx.copy,
        evidenceRequired: false,
        suggestedAction: 'Add a clear terms/disclaimer line to the campaign copy.',
      }),
    ];
  },
};
