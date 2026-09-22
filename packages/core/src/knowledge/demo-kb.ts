import type { KnowledgeSourceType } from '../types/enums';

/**
 * Curated fictional demo knowledge base.
 *
 * NOTHING HERE IS A REAL REGULATION, POLICY, OR BRAND GUIDELINE.
 * Everything is invented for the MVP demo and is clearly prefixed with
 * "[Fictional Demo]". The knowledge base intentionally contains a
 * "Health / therapeutic claims" doc so the Compliance Agent has a
 * reachable citation when it evaluates the "Clinically proven" line.
 */

export interface DemoKnowledgeDoc {
  title: string;
  sourceType: KnowledgeSourceType;
  category?: string;
  geography?: string;
  documentType?: string;
  content: string;
}

export const DEMO_KB: DemoKnowledgeDoc[] = [
  {
    title:
      '[Fictional Demo] Fictional Beauty Co. — Internal marketing policy v1.0',
    sourceType: 'internal_policy',
    category: 'marketing_policy',
    geography: 'IN',
    documentType: 'policy',
    content: `# Purpose

This is a fictional internal marketing policy created for the Guardrail MVP demo. It does not represent any real company or regulator.

# Disclaimers

- Every promotional campaign referencing a discount or offer window must include either "T&C apply" or "Terms and conditions apply" in the primary copy.
- Influencer content must carry an explicit disclosure tag such as #ad, #sponsored, #partner, or #paidpartnership.

# Discount claims

- Any advertised discount must state the exact offer window (start and end).
- Discounts are only valid on regular-price items unless the copy explicitly states otherwise.

# Cultural campaigns

- Campaigns tied to a festival or cultural event should include a short "celebrate responsibly" reminder near the call to action.
- Cultural imagery should be reviewed by a regional lead before publication.

# Human review triggers

- Any campaign containing a health-style claim (e.g. "clinically proven", "doctor recommended") must be routed to human review before publication.
- Any campaign whose Cultural Risk is HIGH must be routed to human review.
`,
  },
  {
    title:
      '[Fictional Demo] Fictional Beauty Co. — Health / therapeutic claim guidance',
    sourceType: 'brand_guideline',
    category: 'health_claims',
    geography: 'IN',
    documentType: 'guideline',
    content: `# Health and therapeutic claim guidance (fictional demo)

This guidance is fictional and applies only to the Guardrail MVP demo dataset.

# When a claim is a "health claim"

For this demo, a claim is treated as a health claim when it uses one of the following phrases in campaign copy:

- "Clinically proven"
- "Doctor recommended"
- "Scientifically proven"
- "Guaranteed results"
- "Cures", "Treats"

# Evidence requirement

- A health claim can only be published if the campaign attaches an approved clinical or regulatory reference.
- If no approved reference is attached, the campaign is not approved for publication and must be sent to human review.
- The Compliance Agent must set \`evidenceStatus = REQUIRES_HUMAN_REVIEW\` if no matching approved reference exists in this knowledge base.

# Alternatives that DO NOT require evidence

The following phrasings are considered soft claims and do not require attached evidence:

- "May help support..."
- "Traditionally used for..."
- "Designed to complement your routine"
`,
  },
  {
    title: '[Fictional Demo] Approved marketing claims register',
    sourceType: 'approved_claim',
    category: 'approved_claims',
    geography: 'IN',
    documentType: 'register',
    content: `# Approved claims register (fictional demo)

This register lists claims that internal legal/brand review has explicitly approved for use.

# Autumn Skincare Refresh

- "Refresh your daily routine this autumn"
- "Gentle cleanser, hydrating serum and lightweight moisturiser"
- "Designed for cooler weather"

# Wellness Tea — Immunity Blend

- "Traditionally used herbs"
- "May help support your daily wellness routine"

# NOT on the approved register

- "Clinically proven to deliver visible results in 7 days" — NOT approved. Do not use without new evidence.
- "Doctor recommended" — NOT approved.
`,
  },
  {
    title: '[Fictional Demo] Cultural sensitivity guideline for Diwali campaigns',
    sourceType: 'brand_guideline',
    category: 'cultural_sensitivity',
    geography: 'IN',
    documentType: 'guideline',
    content: `# Cultural sensitivity — Diwali (fictional demo)

This guideline is fictional and only exists for the Guardrail MVP demo. It is written to illustrate context, not to prescribe cultural interpretation.

# Diverse observance

Diwali is observed differently across regions and communities in India. Campaigns should:

- Avoid framing any single tradition as "the" celebration.
- Avoid depicting practices tied to specific religious rituals as universal.
- Use "family, light, tradition" style framing when in doubt.

# Imagery

- Prefer non-denominational visuals (lanterns, marigolds, textiles, home settings).
- Avoid imagery that may be interpreted as commercialising religious ritual.

# Copy patterns

- Prefer inclusive phrasing ("celebrate light, family and tradition").
- Avoid absolutes ("everyone celebrates...", "the only way to...").

# Responsible celebration

- Include a short "celebrate responsibly" reminder to align with the internal marketing policy.
`,
  },
  {
    title:
      '[Fictional Demo] Historical campaign — Autumn Refresh (approved reference)',
    sourceType: 'historical_campaign',
    category: 'historical',
    geography: 'IN',
    documentType: 'case_study',
    content: `# Historical campaign snapshot (fictional demo)

Autumn Skincare Refresh — Fictional Beauty Co., previous cycle.

- No compliance findings above LOW.
- No cultural findings.
- Sentiment analysis: positive.
- Human review outcome: approved without changes.
- This is retained as a reference of what a compliant seasonal campaign looks like.
`,
  },
];
