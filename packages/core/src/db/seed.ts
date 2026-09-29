import { sql } from 'drizzle-orm';

import { getLogger } from '../logging/index';
import { closeDb, getDb } from './client';
import {
  audienceSegments,
  campaignAssets,
  campaignAudienceSegments,
  campaigns,
} from './schema/index';
import type {
  NewAudienceSegmentRow,
  NewCampaignAssetRow,
  NewCampaignAudienceSegmentRow,
  NewCampaignRow,
} from './schema/index';

const log = getLogger({ component: 'db.seed' });

/**
 * Demo dataset. All content is fictional — this file does not encode any
 * real regulatory sources, brands or people. Campaign #2 intentionally
 * contains an unsupported claim ("clinically proven") so the analysis
 * pipeline has something to flag once agents come online in later steps.
 */

const AUDIENCE_SEGMENTS: readonly Pick<
  NewAudienceSegmentRow,
  'key' | 'name' | 'description'
>[] = [
  {
    key: 'general_audience',
    name: 'General audience',
    description:
      'Broad public with no specific demographic bias. Baseline perspective used for every campaign.',
  },
  {
    key: 'existing_customers',
    name: 'Existing customers',
    description:
      'People who have purchased from the brand before and are already familiar with tone, pricing and product range.',
  },
  {
    key: 'younger_digital',
    name: 'Younger digital audience',
    description:
      'Digitally native audience that discovers brands primarily through short-form video and creator content.',
  },
  {
    key: 'family_oriented',
    name: 'Family-oriented audience',
    description:
      'Households making purchasing decisions with children or extended family in mind; sensitive to inclusivity and safety framing.',
  },
  {
    key: 'festival_focused',
    name: 'Festival / event-focused audience',
    description:
      'Audience segment engaging specifically around a festival, holiday or cultural event window.',
  },
  {
    key: 'adult_wagering',
    name: 'Adult wagering customers (18+)',
    description:
      'Verified adult account holders or account-acquisition prospects for licensed AU wagering.',
  },
  {
    key: 'sports_fans_adult',
    name: 'Adult sports fans',
    description:
      'Adults who follow AFL/NRL/racing; sensitive to betting framed as optional product info vs identity pressure.',
  },
  {
    key: 'parents_youth_advocates',
    name: 'Parents & youth-safety advocates',
    description:
      'Adults concerned about gambling-ad normalisation around sport and children; high sensitivity to family framing.',
  },

];

interface SeedCampaign {
  readonly name: string;
  readonly copy: string;
  readonly campaignType: NewCampaignRow['campaignType'];
  readonly platform: NewCampaignRow['platform'];
  readonly geography: NewCampaignRow['geography'];
  readonly festivalContext?: NewCampaignRow['festivalContext'];
  readonly applicablePolicyContext: string[];
  readonly audienceSegmentKeys: string[];
  readonly assets: Omit<NewCampaignAssetRow, 'campaignId'>[];
}

const CAMPAIGNS: readonly SeedCampaign[] = [
  {
    name: '[Demo] Autumn Skincare Refresh — Fictional Beauty Co.',
    copy: 'Refresh your daily routine this autumn with our seasonal Fictional Beauty Co. collection. Gentle cleanser, hydrating serum and lightweight moisturiser designed for cooler weather.',
    campaignType: 'seasonal',
    platform: 'instagram',
    geography: { country: 'IN', region: 'National' },
    applicablePolicyContext: ['internal_marketing_policy', 'brand_guideline'],
    audienceSegmentKeys: ['general_audience', 'existing_customers'],
    assets: [
      {
        type: 'text',
        title: 'Primary caption',
        description: 'Instagram feed caption. No product claims beyond seasonal positioning.',
      },
      {
        type: 'image',
        title: 'Autumn product family (reference)',
        description: 'Flat-lay of three fictional products on neutral background.',
        url: 'https://example.invalid/demo/autumn-flatlay.jpg',
      },
    ],
  },
  {
    name: '[Demo] Flash Weekend Sale — Premium Serum',
    copy: '50% off our premium Fictional Beauty Co. serum this weekend only. Clinically proven to deliver visible results in 7 days.',
    campaignType: 'promotional',
    platform: 'facebook',
    geography: { country: 'IN', region: 'National' },
    applicablePolicyContext: [
      'internal_marketing_policy',
      'brand_guideline',
      'promotional_offer_policy',
    ],
    audienceSegmentKeys: ['existing_customers', 'younger_digital'],
    assets: [
      {
        type: 'text',
        title: 'Sale banner copy',
        description:
          'Primary ad copy including discount percentage and time-limited offer window.',
      },
      {
        type: 'image',
        title: 'Serum hero image (reference)',
        url: 'https://example.invalid/demo/serum-hero.jpg',
      },
    ],
  },
  {
    name: '[Demo] Diwali Home Collection',
    copy: 'Bring warmth home this Diwali with our limited-edition Fictional Home Co. lanterns and textiles. Celebrate light, family and tradition.',
    campaignType: 'seasonal',
    platform: 'instagram',
    geography: { country: 'IN', region: 'National' },
    festivalContext: {
      key: 'diwali',
      name: 'Diwali',
      description:
        'Major cultural festival in India with wide regional variation in observance.',
    },
    applicablePolicyContext: [
      'internal_marketing_policy',
      'brand_guideline',
      'cultural_sensitivity_guideline',
    ],
    audienceSegmentKeys: [
      'general_audience',
      'family_oriented',
      'festival_focused',
    ],
    assets: [
      {
        type: 'text',
        title: 'Feed caption',
        description: 'Festival-themed positioning of home collection.',
      },
      {
        type: 'image',
        title: 'Lifestyle image (reference)',
        url: 'https://example.invalid/demo/diwali-lifestyle.jpg',
      },
    ],
  },
  {
    name: '[Demo] Wellness Tea — Immunity Blend',
    copy: 'Our new Fictional Wellness Co. Immunity Blend combines traditional herbs to help support your daily wellness routine.',
    campaignType: 'product_launch',
    platform: 'web',
    geography: { country: 'IN', region: 'National' },
    applicablePolicyContext: [
      'internal_marketing_policy',
      'brand_guideline',
      'health_claim_policy',
    ],
    audienceSegmentKeys: ['general_audience', 'family_oriented'],
    assets: [
      {
        type: 'text',
        title: 'Landing page hero copy',
        description:
          'Hero section of the product landing page. Wording deliberately soft ("help support") — a case where evidence is likely insufficient either way.',
      },
      {
        type: 'image',
        title: 'Packaging shot (reference)',
        url: 'https://example.invalid/demo/wellness-tea-pack.jpg',
      },
    ],
  },
  {
    name: '[Demo] Tabcorp — Race-day form guide (compliant website module)',
    copy: `TAB Race Day Form Guide

Check today's form, fields and prices on TAB.com.au — for customers aged 18+ only.

Compare runners, follow the meetings that matter to you, and only place bets if they fit your budget and your personal limits. This module is informational and does not target children or families.

18+ only. Gamble responsibly. Set deposit limits in your account. If gambling is causing you harm, get free support via Gambling Help Online on 1800 858 858 or visit gamblinghelponline.org.au. You can self-exclude through BetStop, the National Self-Exclusion Register.

Terms and conditions apply. Odds subject to change. Licensed Australian wagering operator.`,
    campaignType: 'promotional',
    platform: 'web',
    geography: { country: 'AU', region: 'National' },
    applicablePolicyContext: [
      'wagering_advertising',
      'internal_marketing_policy',
      'responsible_gambling',
    ],
    audienceSegmentKeys: ['adult_wagering', 'sports_fans_adult', 'existing_customers'],
    assets: [
      {
        type: 'text',
        title: 'Website hero + body',
        description:
          'Compliant Tabcorp-style website module: 18+, RG message, help pathway, BetStop, no exaggerated win claims, no family/children framing.',
      },
      {
        type: 'url',
        title: 'Landing URL (reference)',
        url: 'https://example.invalid/demo/tabcorp/race-day-form-guide',
      },
    ],
  },
  {
    name: '[Demo] Tabcorp — Guaranteed winner boost (non-compliant website module)',
    copy: `TAB GUARANTEED WINNER BOOST — THIS WEEKEND ONLY

Bring the kids to watch the footy and turn game day into easy money for the whole family.

Open a TAB account and get a $500 bonus bet plus a locked-in winning multi — you can't lose. Real fans bet big. Financial freedom starts with your next deposit.

No ID checks needed to claim. Offer pushed to all customers including those who previously asked to stop marketing.

Bet now. Win now.`,
    campaignType: 'promotional',
    platform: 'web',
    geography: { country: 'AU', region: 'National' },
    applicablePolicyContext: [
      'wagering_advertising',
      'internal_marketing_policy',
      'responsible_gambling',
      'inducements',
    ],
    audienceSegmentKeys: [
      'adult_wagering',
      'sports_fans_adult',
      'family_oriented',
      'younger_digital',
    ],
    assets: [
      {
        type: 'text',
        title: 'Website hero (non-compliant)',
        description:
          'Intentionally violates AU wagering ad themes: children/family framing, guaranteed wins, wealth promises, missing RG/18+/BetStop, inducements despite opt-out.',
      },
      {
        type: 'url',
        title: 'Landing URL (reference)',
        url: 'https://example.invalid/demo/tabcorp/guaranteed-winner-boost',
      },
    ],
  },
  {
    name: '[Demo] Tabcorp — Real fans bet through the siren (sentiment risk / legally dressed)',
    copy: `TAB — REAL FANS DON'T JUST WATCH

If you're serious about the game, you're on the multi before the siren. Don't just talk about your side — back them. Anything less, and are you even a real supporter?

Same odds tools. Same meetings. Same TAB.com.au experience for adults 18+.

18+ only. Gamble responsibly. Call Gambling Help Online on 1800 858 858 or visit gamblinghelponline.org.au. BetStop self-exclusion is available. Terms and conditions apply. Odds subject to change.`,
    campaignType: 'brand',
    platform: 'web',
    geography: { country: 'AU', region: 'National' },
    applicablePolicyContext: [
      'wagering_advertising',
      'internal_marketing_policy',
      'responsible_gambling',
      'cultural_sensitivity_guideline',
    ],
    audienceSegmentKeys: [
      'adult_wagering',
      'sports_fans_adult',
      'parents_youth_advocates',
      'family_oriented',
    ],
    assets: [
      {
        type: 'text',
        title: 'Website brand module (sentiment risk)',
        description:
          'Includes 18+/RG/help/BetStop/T&Cs (legally dressed) but real-fan identity-pressure framing is high sentiment polarisation risk without child/family participation claims.',
      },
      {
        type: 'url',
        title: 'Landing URL (reference)',
        url: 'https://example.invalid/demo/tabcorp/real-fans-bet',
      },
    ],
  },

];

export async function runSeed(): Promise<void> {
  const db = getDb();

  await db.transaction(async (tx) => {
    log.info('truncating_demo_tables');
    await tx.execute(
      sql`TRUNCATE
        audit_logs,
        human_reviews,
        recommendations,
        risk_assessments,
        evidence,
        findings,
        analysis_runs,
        campaign_audience_segments,
        campaign_assets,
        campaigns,
        audience_segments
      RESTART IDENTITY CASCADE`,
    );

    log.info({ count: AUDIENCE_SEGMENTS.length }, 'inserting_audience_segments');
    const insertedSegments = await tx
      .insert(audienceSegments)
      .values([...AUDIENCE_SEGMENTS])
      .returning({ id: audienceSegments.id, key: audienceSegments.key });
    const segmentIdByKey = new Map(insertedSegments.map((s) => [s.key, s.id]));

    log.info({ count: CAMPAIGNS.length }, 'inserting_campaigns');
    for (const c of CAMPAIGNS) {
      const [inserted] = await tx
        .insert(campaigns)
        .values({
          name: c.name,
          copy: c.copy,
          campaignType: c.campaignType,
          platform: c.platform,
          geography: c.geography,
          festivalContext: c.festivalContext,
          applicablePolicyContext: c.applicablePolicyContext,
          status: 'ready_for_analysis',
        })
        .returning({ id: campaigns.id });

      if (!inserted) throw new Error(`Failed to insert campaign: ${c.name}`);

      if (c.assets.length > 0) {
        await tx.insert(campaignAssets).values(
          c.assets.map((a) => ({
            ...a,
            campaignId: inserted.id,
          })),
        );
      }

      const links: NewCampaignAudienceSegmentRow[] = [];
      for (const key of c.audienceSegmentKeys) {
        const segId = segmentIdByKey.get(key);
        if (!segId) throw new Error(`Unknown audience segment key: ${key}`);
        links.push({ campaignId: inserted.id, audienceSegmentId: segId });
      }
      if (links.length > 0) {
        await tx.insert(campaignAudienceSegments).values(links);
      }
    }
  });

  log.info('seed_complete');
}

const isEntrypoint =
  import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` ||
  import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`;

if (isEntrypoint) {
  runSeed()
    .then(async () => {
      await closeDb();
      process.exit(0);
    })
    .catch(async (err: unknown) => {
      log.error({ err }, 'seed_failed');
      await closeDb();
      process.exit(1);
    });
}
