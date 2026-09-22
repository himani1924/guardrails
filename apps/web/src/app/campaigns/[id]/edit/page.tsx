import { audience, campaigns } from '@guardrail/core';
import { notFound } from 'next/navigation';

import { AppShell } from '@/components/app-shell';
import { SectionHeading } from '@/components/ui';
import { CampaignForm } from '@/components/campaign-form';

export const dynamic = 'force-dynamic';

export default async function EditCampaignPage(
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  let existing;
  try {
    existing = await campaigns.getCampaignById(id);
  } catch {
    notFound();
  }
  const segments = await audience.listAudienceSegments();

  return (
    <AppShell>
      <SectionHeading eyebrow={`Editing ${existing.name}`} title="Edit campaign" />
      <CampaignForm
        mode="edit"
        segments={segments}
        initialId={id}
        initial={{
          name: existing.name,
          copy: existing.copy,
          campaignType: existing.campaignType,
          platform: existing.platform,
          geography: existing.geography,
          festivalContext: existing.festivalContext,
          audienceSegmentKeys: existing.audienceSegmentIds,
          applicablePolicyContext: [],
        }}
      />
    </AppShell>
  );
}
