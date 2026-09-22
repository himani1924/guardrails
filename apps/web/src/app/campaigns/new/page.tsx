import { audience } from '@guardrail/core';

import { AppShell } from '@/components/app-shell';
import { SectionHeading } from '@/components/ui';
import { CampaignForm } from '@/components/campaign-form';

export const dynamic = 'force-dynamic';

export default async function NewCampaignPage() {
  const segments = await audience.listAudienceSegments();
  return (
    <AppShell>
      <SectionHeading eyebrow="New campaign" title="Draft a new campaign" />
      <CampaignForm mode="create" segments={segments} />
    </AppShell>
  );
}
