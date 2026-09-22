import { buildFinding, type Rule } from '../base';

export const campaignMetadataRule: Rule = {
  id: 'required_campaign_metadata',
  name: 'Required campaign metadata',
  description:
    'Every campaign must have non-empty copy, at least one audience segment and a valid geography.',
  applicableWhen: () => true,

  evaluate(ctx, runId) {
    const findings = [];
    if (ctx.copy.trim().length === 0) {
      findings.push(
        buildFinding(this, runId, {
          category: 'other',
          severity: 'high',
          title: 'Campaign copy is empty',
          explanation: 'Analysis needs at least a non-empty campaign copy.',
          evidenceRequired: false,
          suggestedAction: 'Add campaign copy before requesting analysis.',
        }),
      );
    }
    if (ctx.audienceSegmentKeys.length === 0) {
      findings.push(
        buildFinding(this, runId, {
          category: 'other',
          severity: 'medium',
          title: 'No audience segment selected',
          explanation: 'The campaign must target at least one configured audience segment.',
          evidenceRequired: false,
          suggestedAction: 'Attach at least one audience segment.',
        }),
      );
    }
    if (!ctx.geography.country || ctx.geography.country.length < 2) {
      findings.push(
        buildFinding(this, runId, {
          category: 'other',
          severity: 'medium',
          title: 'Geography missing or invalid',
          explanation: 'Analysis needs an ISO country code to select applicable rules.',
          evidenceRequired: false,
          suggestedAction: 'Set the campaign country before requesting analysis.',
        }),
      );
    }
    return findings;
  },
};
