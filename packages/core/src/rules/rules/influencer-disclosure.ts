import { buildFinding, type Rule } from '../base';

export const influencerDisclosureRule: Rule = {
  id: 'influencer_disclosure',
  name: 'Influencer disclosure',
  description:
    'Influencer campaigns must carry a disclosure tag such as #ad or #sponsored.',

  applicableWhen: (ctx) => ctx.campaignType === 'influencer',

  evaluate(ctx, runId) {
    const has = /#ad\b|#sponsored\b|#paidpartnership\b|#partner\b/i.test(ctx.copy);
    if (has) return [];
    return [
      buildFinding(this, runId, {
        category: 'influencer_disclosure',
        severity: 'high',
        title: 'Influencer disclosure tag missing',
        explanation:
          'The campaign is tagged as influencer content but no #ad, #sponsored, #partner or #paidpartnership tag was detected in the copy.',
        affectedContent: ctx.copy,
        evidenceRequired: false,
        requiresHumanReview: true,
        suggestedAction: 'Add an explicit disclosure tag such as #ad.',
      }),
    ];
  },
};
