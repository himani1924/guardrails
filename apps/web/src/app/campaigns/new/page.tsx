import { audience } from '@guardrail/core';

import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/ui';
import { CampaignForm } from '@/components/campaign-form';

export const dynamic = 'force-dynamic';

export default async function NewCampaignPage() {
  const segments = await audience.listAudienceSegments();
  return (
    <AppShell>
      <PageHeader
        eyebrow="New campaign"
        title="Draft a new campaign"
        description="Describe the campaign, pick the policies that apply and the audiences to simulate. You can run the analysis once it is saved."
      />
      <CampaignForm mode="create" segments={segments} />
    </AppShell>
  );
}
