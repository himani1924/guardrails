import type { LLMCompletionRequest, LLMStructuredRequest } from '../ai/types';
import type { MockLLMProvider } from '../ai/mock-provider';

type AnyLLMRequest = LLMCompletionRequest | LLMStructuredRequest<unknown>;

/**
 * Registers deterministic mock responses for the four seeded demo campaigns
 * so `npm run dev` produces a reliable analysis without an OPENAI_API_KEY.
 *
 * Called by the AI factory when LLM_PROVIDER=mock.
 */
export function programDemoFixtures(mock: MockLLMProvider): void {
  mock.respondTo(
    (req) => isSchema(req, 'ComplianceFindings') && isCampaign(req, '[Demo] Autumn Skincare Refresh'),
    {
      findings: [],
    },
  );
  mock.respondTo(
    (req) => isSchema(req, 'SentimentAnalysis') && isCampaign(req, '[Demo] Autumn Skincare Refresh'),
    {
      overallSentiment: 'positive',
      tone: 'friendly, seasonal',
      emotions: ['warmth', 'anticipation'],
      riskSignals: [],
      overallConfidence: 0.86,
    },
  );
  mock.respondTo(
    (req) => isSchema(req, 'AudiencePerspectives') && isCampaign(req, '[Demo] Autumn Skincare Refresh'),
    {
      perspectives: [
        {
          audienceSegmentKey: 'general_audience',
          possibleInterpretation:
            'Under this configured audience perspective, the following interpretation may occur: a routine seasonal refresh with clear benefits.',
          positiveSignals: ['seasonal relevance', 'clear product framing'],
          concernSignals: [],
          confidence: 0.84,
        },
        {
          audienceSegmentKey: 'existing_customers',
          possibleInterpretation:
            'Under this configured audience perspective, the following interpretation may occur: familiar product family, low-risk update.',
          positiveSignals: ['brand consistency'],
          concernSignals: [],
          confidence: 0.86,
        },
      ],
      agreement: 'All perspectives view this as a low-risk seasonal update.',
      polarizationRisk: 'low',
    },
  );

  mock.respondTo(
    (req) => isSchema(req, 'ComplianceFindings') && isCampaign(req, '[Demo] Flash Weekend Sale'),
    {
      findings: [
        {
          category: 'unsupported_claim',
          severity: 'high',
          title: 'Unsupported "Clinically proven" health-style claim',
          explanation:
            'The copy asserts "Clinically proven to deliver visible results in 7 days" but the approved claims register explicitly lists this phrase as NOT approved. No approved supporting evidence is attached.',
          affectedContent: 'Clinically proven to deliver visible results in 7 days.',
          confidence: 0.9,
          requiresHumanReview: true,
          evidenceRequired: true,
          evidenceStatus: 'CONTRADICTED',
          suggestedAction:
            'Attach approved clinical evidence or soften the wording to a phrasing on the approved list.',
          citedSourceIds: ['src_1', 'src_2'],
        },
        {
          category: 'pricing',
          severity: 'low',
          title: 'Weekend-only offer window is present but end date is implicit',
          explanation:
            'The copy references "this weekend only" but no explicit end date. Internal policy prefers a stated end date.',
          affectedContent: '50% off ... this weekend only',
          confidence: 0.7,
          requiresHumanReview: false,
          evidenceRequired: false,
          evidenceStatus: 'SUPPORTED',
          suggestedAction:
            'Add an explicit start and end date to remove ambiguity.',
          citedSourceIds: ['src_1'],
        },
      ],
    },
  );
  mock.respondTo(
    (req) => isSchema(req, 'SentimentAnalysis') && isCampaign(req, '[Demo] Flash Weekend Sale'),
    {
      overallSentiment: 'mixed',
      tone: 'urgent, promotional',
      emotions: ['urgency', 'skepticism'],
      riskSignals: [
        {
          title: 'Urgent claim tone may amplify skepticism',
          explanation:
            'The combined "50% off" and "clinically proven" framing may be perceived as overselling by cautious audiences.',
          severity: 'medium',
          confidence: 0.68,
        },
      ],
      overallConfidence: 0.7,
    },
  );
  mock.respondTo(
    (req) => isSchema(req, 'AudiencePerspectives') && isCampaign(req, '[Demo] Flash Weekend Sale'),
    {
      perspectives: [
        {
          audienceSegmentKey: 'existing_customers',
          possibleInterpretation:
            'Under this configured audience perspective, the following interpretation may occur: a familiar sale, but the clinical claim is unusual for this brand.',
          positiveSignals: ['clear discount'],
          concernSignals: ['clinical language feels out of tone'],
          confidence: 0.72,
        },
        {
          audienceSegmentKey: 'younger_digital',
          possibleInterpretation:
            'Under this configured audience perspective, the following interpretation may occur: attractive discount, but the "clinically proven" line reduces trust without a citation.',
          positiveSignals: ['discount headline'],
          concernSignals: ['unsupported claim', 'skepticism'],
          confidence: 0.72,
        },
      ],
      polarizationRisk: 'medium',
    },
  );

  mock.respondTo(
    (req) => isSchema(req, 'ComplianceFindings') && isCampaign(req, '[Demo] Diwali Home Collection'),
    {
      findings: [],
    },
  );
  mock.respondTo(
    (req) => isSchema(req, 'SentimentAnalysis') && isCampaign(req, '[Demo] Diwali Home Collection'),
    {
      overallSentiment: 'positive',
      tone: 'warm, celebratory',
      emotions: ['warmth', 'nostalgia'],
      riskSignals: [
        {
          title: 'Cultural framing may resonate differently across regions',
          explanation:
            'The copy generalises Diwali celebration. Some audiences may prefer more inclusive framing.',
          severity: 'medium',
          confidence: 0.64,
        },
      ],
      overallConfidence: 0.68,
    },
  );
  mock.respondTo(
    (req) => isSchema(req, 'CulturalSignals') && isCampaign(req, '[Demo] Diwali Home Collection'),
    {
      contextualSignals: [
        {
          title: 'Diwali framing lacks regional inclusivity nuance',
          potentialInterpretation:
            'The internal cultural sensitivity guideline recommends avoiding "the celebration"-style framing. The current copy could be interpreted as generalising a diverse festival.',
          affectedContext: 'Diwali',
          severity: 'high',
          confidence: 0.7,
          citedSourceIds: ['src_1'],
          humanReviewRecommended: true,
        },
      ],
      overallConfidence: 0.7,
    },
  );
  mock.respondTo(
    (req) => isSchema(req, 'AudiencePerspectives') && isCampaign(req, '[Demo] Diwali Home Collection'),
    {
      perspectives: [
        {
          audienceSegmentKey: 'family_oriented',
          possibleInterpretation:
            'Under this configured audience perspective, the following interpretation may occur: warm, family-forward framing.',
          positiveSignals: ['family framing', 'tradition'],
          concernSignals: [],
          confidence: 0.72,
        },
        {
          audienceSegmentKey: 'festival_focused',
          possibleInterpretation:
            'Under this configured audience perspective, the following interpretation may occur: attractive seasonal offering, but generalises regional practices.',
          positiveSignals: ['festival relevance'],
          concernSignals: ['regional variation not acknowledged'],
          confidence: 0.66,
        },
        {
          audienceSegmentKey: 'general_audience',
          possibleInterpretation:
            'Under this configured audience perspective, the following interpretation may occur: broadly inclusive, but some may find it too generic.',
          positiveSignals: ['inclusive tone'],
          concernSignals: ['generic'],
          confidence: 0.62,
        },
      ],
      agreement: 'Warmth and family framing land positively across perspectives.',
      disagreement:
        'Concerns about regional generalisation appear in festival-focused and general audiences but not family-oriented.',
      polarizationRisk: 'high',
      polarizationExplanation:
        'Interpretations diverge on regional inclusivity; recommend human review by a regional lead.',
    },
  );

  mock.respondTo(
    (req) => isSchema(req, 'ComplianceFindings') && isCampaign(req, '[Demo] Wellness Tea'),
    {
      findings: [
        {
          category: 'unsupported_claim',
          severity: 'medium',
          title: 'Soft health claim needs evidence review',
          explanation:
            'The phrasing "help support your daily wellness routine" is on the softer list in the health-claim guideline, but this specific product blend is not on the approved register. Insufficient evidence to confirm either way.',
          affectedContent: 'help support your daily wellness routine',
          confidence: 0.55,
          requiresHumanReview: true,
          evidenceRequired: true,
          evidenceStatus: 'INSUFFICIENT_EVIDENCE',
          uncertainty:
            'Retrieved policy allows soft phrasing but does not confirm this product.',
          suggestedAction:
            'Route to human review to confirm the phrasing for this specific blend.',
          citedSourceIds: ['src_1'],
        },
      ],
    },
  );
  mock.respondTo(
    (req) => isSchema(req, 'SentimentAnalysis') && isCampaign(req, '[Demo] Wellness Tea'),
    {
      overallSentiment: 'neutral',
      tone: 'calm, wellness-focused',
      emotions: ['calm'],
      riskSignals: [],
      overallConfidence: 0.6,
      overallUncertainty:
        'Softness of the claim leaves room for varied interpretation.',
    },
  );
  mock.respondTo(
    (req) => isSchema(req, 'AudiencePerspectives') && isCampaign(req, '[Demo] Wellness Tea'),
    {
      perspectives: [
        {
          audienceSegmentKey: 'general_audience',
          possibleInterpretation:
            'Under this configured audience perspective, the following interpretation may occur: reasonable soft claim.',
          positiveSignals: ['calm tone'],
          concernSignals: [],
          ambiguity: 'What "support" actually means is unclear.',
          confidence: 0.55,
        },
        {
          audienceSegmentKey: 'family_oriented',
          possibleInterpretation:
            'Under this configured audience perspective, the following interpretation may occur: fits into a wellness routine.',
          positiveSignals: ['wellness framing'],
          concernSignals: [],
          confidence: 0.58,
        },
      ],
      polarizationRisk: 'low',
    },
  );
}

function isSchema(req: AnyLLMRequest, name: string): boolean {
  const schemaName = 'schemaName' in req ? req.schemaName : undefined;
  return schemaName === name;
}

/**
 * Matches when the campaign NAME field in the prompt starts with the given
 * prefix. Checking only the `name:` line prevents RAG evidence excerpts from
 * accidentally satisfying a matcher (e.g. the historical Autumn doc leaking
 * the string "Autumn Skincare Refresh" into a Flash prompt).
 */
function isCampaign(req: AnyLLMRequest, prefix: string): boolean {
  return req.prompt.includes(`name: ${prefix}`);
}
